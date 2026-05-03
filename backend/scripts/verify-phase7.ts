import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:4030/api";
const marker = `phase7-${Date.now()}`;

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
  const [warehouse, products] = await Promise.all([
    prisma.warehouse.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 2,
      select: { id: true, sku: true, name: true },
    }),
  ]);

  if (!warehouse || products.length < 2) {
    throw new Error("Missing seed data for phase 7 verification");
  }

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

  const supplierCode = `SUP-P7-${Date.now()}`;
  const createSupplier = await request("/suppliers", {
    method: "POST",
    headers,
    body: JSON.stringify({
      code: supplierCode,
      name: `Phase 7 Supplier ${marker}`,
      email: `${marker}@example.com`,
      phone: "+1-555-777-1000",
      productMappings: [
        {
          productId: products[0].id,
          supplierSku: `${supplierCode}-${products[0].sku}`,
          supplierUnitCost: 12.34,
          leadTimeDays: 7,
          minimumOrderQty: 2,
        },
      ],
    }),
  });

  if (createSupplier.status !== 201) {
    console.log(JSON.stringify({ ok: false, step: "createSupplier", createSupplier }, null, 2));
    process.exit(1);
  }

  const supplierId = createSupplier.body.data.id as string;

  const updateSupplier = await request(`/suppliers/${supplierId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      replaceMappings: false,
      productMappings: [
        {
          productId: products[1].id,
          supplierSku: `${supplierCode}-${products[1].sku}`,
          supplierUnitCost: 18.91,
          leadTimeDays: 5,
          minimumOrderQty: 1,
        },
      ],
    }),
  });

  if (updateSupplier.status !== 200) {
    console.log(JSON.stringify({ ok: false, step: "updateSupplier", updateSupplier }, null, 2));
    process.exit(1);
  }

  const initialLevels = await request(
    `/inventory/levels?productId=${products[0].id}&warehouseId=${warehouse.id}`,
    { headers },
  );
  const initialOnHand = Number(initialLevels.body?.data?.[0]?.quantityOnHand ?? 0);

  const createPo = await request("/purchase-orders", {
    method: "POST",
    headers,
    body: JSON.stringify({
      supplierId,
      warehouseId: warehouse.id,
      taxAmount: 1.25,
      items: [
        {
          productId: products[0].id,
          quantityOrdered: 5,
        },
      ],
    }),
  });

  if (createPo.status !== 201) {
    console.log(JSON.stringify({ ok: false, step: "createPo", createPo }, null, 2));
    process.exit(1);
  }

  const poId = createPo.body.data.id as string;
  const poNumber = createPo.body.data.orderNumber as string;

  const approvePo = await request(`/purchase-orders/${poId}/status`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ status: "APPROVED" }),
  });

  const receivePo = await request(`/purchase-orders/${poId}/status`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ status: "RECEIVED" }),
  });

  const poDetail = await request(`/purchase-orders/${poId}`, { headers });
  const levelsAfter = await request(
    `/inventory/levels?productId=${products[0].id}&warehouseId=${warehouse.id}`,
    { headers },
  );
  const movements = await request(`/inventory/movements?productId=${products[0].id}&pageSize=100`, {
    headers,
  });

  const afterOnHand = Number(levelsAfter.body?.data?.[0]?.quantityOnHand ?? 0);
  const expectedOnHand = initialOnHand + 5;

  const poMovements = (movements.body?.data ?? []).filter(
    (item: any) => item.referenceDocument === poNumber,
  );

  const createCancelledPo = await request("/purchase-orders", {
    method: "POST",
    headers,
    body: JSON.stringify({
      supplierId,
      warehouseId: warehouse.id,
      taxAmount: 0,
      items: [
        {
          productId: products[1].id,
          quantityOrdered: 2,
        },
      ],
    }),
  });

  const cancelPo = await request(`/purchase-orders/${createCancelledPo.body.data.id}/status`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ status: "CANCELED" }),
  });

  const listPos = await request("/purchase-orders?page=1&pageSize=5", { headers });

  const result = {
    ok:
      createSupplier.status === 201 &&
      updateSupplier.status === 200 &&
      createPo.status === 201 &&
      approvePo.status === 200 &&
      receivePo.status === 200 &&
      poDetail.status === 200 &&
      levelsAfter.status === 200 &&
      movements.status === 200 &&
      cancelPo.status === 200 &&
      listPos.status === 200 &&
      poDetail.body.data.status === "RECEIVED" &&
      poMovements.some((item: any) => item.movementType === "IN") &&
      Math.abs(afterOnHand - expectedOnHand) < 0.0001,
    checks: {
      createSupplierStatus: createSupplier.status,
      updateSupplierStatus: updateSupplier.status,
      createPoStatus: createPo.status,
      approvePoStatus: approvePo.status,
      receivePoStatus: receivePo.status,
      getPoStatus: poDetail.status,
      listPoStatus: listPos.status,
      cancelPoStatus: cancelPo.status,
      expectedOnHand,
      actualOnHand: afterOnHand,
      poMovementCount: poMovements.length,
      poFinalStatus: poDetail.body.data.status,
      poItemReceived: poDetail.body.data.items?.[0]?.quantityReceived,
    },
    context: {
      marker,
      supplierId,
      poId,
      poNumber,
      warehouse: { id: warehouse.id, code: warehouse.code, name: warehouse.name },
      product: products[0],
    },
    samples: {
      supplierMappingsAfterUpdate: updateSupplier.body.data.productMappings,
      poDetail: poDetail.body.data,
      poMovements,
      cancelledPoStatus: cancelPo.body.data.status,
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
