import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:4040/api";
const marker = `phase8-${Date.now()}`;

type HttpResult = {
  status: number;
  body: any;
};

async function request(path: string, init?: RequestInit): Promise<HttpResult> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function main() {
  const [warehouse, richLevel, secondLevel] = await Promise.all([
    prisma.warehouse.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
    prisma.inventoryLevel.findFirst({
      where: {
        quantityAvailable: { gt: 10 },
        warehouse: { deletedAt: null },
        product: { deletedAt: null },
      },
      include: {
        product: { select: { id: true, sku: true, name: true, unitPrice: true } },
        warehouse: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.inventoryLevel.findFirst({
      where: {
        quantityAvailable: { gt: 0 },
        warehouse: { deletedAt: null },
        product: { deletedAt: null },
      },
      include: {
        product: { select: { id: true, sku: true, name: true, unitPrice: true } },
        warehouse: true,
      },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  if (!warehouse || !richLevel || !secondLevel) {
    throw new Error("Missing inventory levels for phase 8 verification");
  }

  const primaryProduct = richLevel.product;
  const primaryWarehouseId = richLevel.warehouseId;

  const login = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "ChangeMe123!" }),
  });

  if (login.status !== 200) {
    console.log(JSON.stringify({ ok: false, step: "login", login }, null, 2));
    process.exit(1);
  }

  const token = login.body.data.accessToken as string;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const beforeLevelRes = await request(
    `/inventory/levels?productId=${primaryProduct.id}&warehouseId=${primaryWarehouseId}`,
    { headers },
  );
  const beforeOnHand = Number(beforeLevelRes.body?.data?.[0]?.quantityOnHand ?? 0);

  const saleQty = 3;

  const createOrder = await request("/sales-orders", {
    method: "POST",
    headers,
    body: JSON.stringify({
      warehouseId: primaryWarehouseId,
      customerName: `Customer ${marker}`,
      taxAmount: 0,
      items: [
        {
          productId: primaryProduct.id,
          quantity: saleQty,
          unitPrice: Number(primaryProduct.unitPrice.toString()),
        },
      ],
    }),
  });

  if (createOrder.status !== 201) {
    console.log(JSON.stringify({ ok: false, step: "createOrder", createOrder }, null, 2));
    process.exit(1);
  }

  const salesOrderId = createOrder.body.data.id as string;
  const salesOrderNumber = createOrder.body.data.orderNumber as string;

  const confirmOrder = await request(`/sales-orders/${salesOrderId}/status`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ status: "CONFIRMED" }),
  });

  const afterLevelRes = await request(
    `/inventory/levels?productId=${primaryProduct.id}&warehouseId=${primaryWarehouseId}`,
    { headers },
  );
  const afterOnHand = Number(afterLevelRes.body?.data?.[0]?.quantityOnHand ?? 0);

  const movementRes = await request(
    `/inventory/movements?productId=${primaryProduct.id}&warehouseId=${primaryWarehouseId}&pageSize=100`,
    { headers },
  );

  const soMovements = (movementRes.body?.data ?? []).filter(
    (item: any) => item.referenceDocument === salesOrderNumber,
  );

  const expectedAfterOnHand = beforeOnHand - saleQty;

  const insufficientQty = beforeOnHand + 9999;
  const beforeFailedAttempt = await request(
    `/inventory/levels?productId=${primaryProduct.id}&warehouseId=${primaryWarehouseId}`,
    { headers },
  );

  const createInsufficientOrder = await request("/sales-orders", {
    method: "POST",
    headers,
    body: JSON.stringify({
      warehouseId: primaryWarehouseId,
      customerName: `Fail Customer ${marker}`,
      taxAmount: 0,
      items: [
        {
          productId: primaryProduct.id,
          quantity: insufficientQty,
          unitPrice: Number(primaryProduct.unitPrice.toString()),
        },
      ],
    }),
  });

  if (createInsufficientOrder.status !== 201) {
    console.log(
      JSON.stringify({ ok: false, step: "createInsufficientOrder", createInsufficientOrder }, null, 2),
    );
    process.exit(1);
  }

  const failOrderId = createInsufficientOrder.body.data.id as string;

  const confirmInsufficient = await request(`/sales-orders/${failOrderId}/status`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ status: "CONFIRMED" }),
  });

  const failedOrderDetail = await request(`/sales-orders/${failOrderId}`, { headers });

  const afterFailedAttempt = await request(
    `/inventory/levels?productId=${primaryProduct.id}&warehouseId=${primaryWarehouseId}`,
    { headers },
  );

  const beforeFailedOnHand = Number(beforeFailedAttempt.body?.data?.[0]?.quantityOnHand ?? 0);
  const afterFailedOnHand = Number(afterFailedAttempt.body?.data?.[0]?.quantityOnHand ?? 0);

  const failedOrderMovements = (movementRes.body?.data ?? []).filter(
    (item: any) => item.referenceDocument === createInsufficientOrder.body.data.orderNumber,
  );

  const listOrders = await request("/sales-orders?page=1&pageSize=10", { headers });
  const detail = await request(`/sales-orders/${salesOrderId}`, { headers });

  const result = {
    ok:
      createOrder.status === 201 &&
      confirmOrder.status === 200 &&
      listOrders.status === 200 &&
      detail.status === 200 &&
      Math.abs(afterOnHand - expectedAfterOnHand) < 0.0001 &&
      soMovements.some((item: any) => item.movementType === "OUT") &&
      confirmInsufficient.status === 409 &&
      failedOrderDetail.status === 200 &&
      failedOrderDetail.body.data.status === "DRAFT" &&
      Math.abs(afterFailedOnHand - beforeFailedOnHand) < 0.0001 &&
      failedOrderMovements.length === 0,
    checks: {
      createOrderStatus: createOrder.status,
      confirmOrderStatus: confirmOrder.status,
      listOrdersStatus: listOrders.status,
      detailStatus: detail.status,
      createInsufficientOrderStatus: createInsufficientOrder.status,
      confirmInsufficientStatus: confirmInsufficient.status,
      failedOrderDetailStatus: failedOrderDetail.status,
      failedOrderStatusAfterFailedConfirm: failedOrderDetail.body.data.status,
      beforeOnHand,
      expectedAfterOnHand,
      actualAfterOnHand: afterOnHand,
      beforeFailedOnHand,
      afterFailedOnHand,
      successfulOrderMovementCount: soMovements.length,
      failedOrderMovementCount: failedOrderMovements.length,
    },
    context: {
      marker,
      product: {
        id: primaryProduct.id,
        sku: primaryProduct.sku,
        name: primaryProduct.name,
      },
      warehouseId: primaryWarehouseId,
      successfulOrder: {
        id: salesOrderId,
        orderNumber: salesOrderNumber,
      },
      failedOrder: {
        id: failOrderId,
        orderNumber: createInsufficientOrder.body.data.orderNumber,
      },
    },
    samples: {
      confirmOrderResponse: confirmOrder.body,
      confirmInsufficientResponse: confirmInsufficient.body,
      successfulOrderMovements: soMovements,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
