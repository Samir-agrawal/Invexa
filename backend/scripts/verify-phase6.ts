import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = "http://localhost:4020/api";
const reasonPrefix = `phase6-${Date.now()}`;

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
  const [product, warehouses] = await Promise.all([
    prisma.product.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, sku: true, name: true },
    }),
    prisma.warehouse.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 2,
      select: { id: true, code: true, name: true },
    }),
  ]);

  if (!product || warehouses.length < 2) {
    throw new Error("Seed data missing for Phase 6 verification");
  }

  const login = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@example.com",
      password: "ChangeMe123!",
    }),
  });

  if (login.status !== 200) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          step: "login",
          login,
        },
        null,
        2,
      ),
    );

    process.exit(1);
  }

  const token = login.body.data.accessToken as string;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const initialLevels = await request(
    `/inventory/levels?productId=${product.id}&warehouseId=${warehouses[0].id}`,
    { headers },
  );

  const initialOnHand = Number(initialLevels.body?.data?.[0]?.quantityOnHand ?? 0);

  const inQuantity = 7;
  const outQuantity = 3;
  const transferQuantity = 2;

  const adjustIn = await request("/inventory/adjust", {
    method: "POST",
    headers,
    body: JSON.stringify({
      productId: product.id,
      warehouseId: warehouses[0].id,
      operation: "IN",
      quantity: inQuantity,
      reason: `${reasonPrefix}-in`,
      referenceDocument: "TEST-IN",
    }),
  });

  const adjustOut = await request("/inventory/adjust", {
    method: "POST",
    headers,
    body: JSON.stringify({
      productId: product.id,
      warehouseId: warehouses[0].id,
      operation: "OUT",
      quantity: outQuantity,
      reason: `${reasonPrefix}-out`,
      referenceDocument: "TEST-OUT",
    }),
  });

  const negativeOut = await request("/inventory/adjust", {
    method: "POST",
    headers,
    body: JSON.stringify({
      productId: product.id,
      warehouseId: warehouses[0].id,
      operation: "OUT",
      quantity: 999999,
      reason: `${reasonPrefix}-negative`,
      referenceDocument: "TEST-NEG",
    }),
  });

  const transfer = await request("/inventory/transfer", {
    method: "POST",
    headers,
    body: JSON.stringify({
      productId: product.id,
      fromWarehouseId: warehouses[0].id,
      toWarehouseId: warehouses[1].id,
      quantity: transferQuantity,
      reason: `${reasonPrefix}-transfer`,
      referenceDocument: "TEST-XFER",
    }),
  });

  const levelsAfter = await request(`/inventory/levels?productId=${product.id}&pageSize=100`, {
    headers,
  });

  const movements = await request(`/inventory/movements?productId=${product.id}&pageSize=100`, {
    headers,
  });

  const fromLevel = levelsAfter.body?.data?.find(
    (item: any) => item.warehouseId === warehouses[0].id,
  );
  const toLevel = levelsAfter.body?.data?.find((item: any) => item.warehouseId === warehouses[1].id);

  const expectedFromOnHand = initialOnHand + inQuantity - outQuantity - transferQuantity;

  const matchedMovements = (movements.body?.data ?? []).filter((item: any) =>
    String(item.reason ?? "").startsWith(reasonPrefix),
  );

  const hasActorOnAllMovements = matchedMovements.every((item: any) => item.actor?.id);
  const hasTransferPair =
    matchedMovements.some((item: any) => item.movementType === "TRANSFER_OUT") &&
    matchedMovements.some((item: any) => item.movementType === "TRANSFER_IN");

  const result = {
    ok:
      adjustIn.status === 200 &&
      adjustOut.status === 200 &&
      negativeOut.status === 409 &&
      transfer.status === 200 &&
      levelsAfter.status === 200 &&
      movements.status === 200 &&
      Math.abs(Number(fromLevel?.quantityOnHand ?? 0) - expectedFromOnHand) < 0.0001 &&
      matchedMovements.length >= 4 &&
      hasActorOnAllMovements &&
      hasTransferPair,
    checks: {
      adjustInStatus: adjustIn.status,
      adjustOutStatus: adjustOut.status,
      negativeOutStatus: negativeOut.status,
      transferStatus: transfer.status,
      levelsStatus: levelsAfter.status,
      movementsStatus: movements.status,
      matchedMovements: matchedMovements.length,
      hasActorOnAllMovements,
      hasTransferPair,
      expectedFromOnHand,
      actualFromOnHand: Number(fromLevel?.quantityOnHand ?? 0),
      actualToOnHand: Number(toLevel?.quantityOnHand ?? 0),
    },
    context: {
      reasonPrefix,
      product,
      fromWarehouse: warehouses[0],
      toWarehouse: warehouses[1],
    },
    sampleMovements: matchedMovements.slice(0, 6),
    responses: {
      adjustIn: adjustIn.body,
      adjustOut: adjustOut.body,
      negativeOut: negativeOut.body,
      transfer: transfer.body,
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
