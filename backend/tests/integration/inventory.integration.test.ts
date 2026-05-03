import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import { loginAdmin, uniqueSku } from "./helpers";

describe("Inventory integration", () => {
  it("adjusts and transfers inventory with movement records", async () => {
    const token = await loginAdmin();

    const warehouses = await prisma.warehouse.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 2,
      select: { id: true },
    });

    expect(warehouses.length).toBeGreaterThanOrEqual(2);

    const created = await prisma.product.create({
      data: {
        sku: uniqueSku("INV"),
        name: "Inventory Phase11 Test",
        category: "Testing",
        brand: "InveXa",
        description: "inventory integration",
        unitPrice: "10.00",
        costPrice: "4.00",
      },
      select: { id: true },
    });

    const [from, to] = warehouses;

    const adjustRes = await request(app)
      .post("/api/inventory/adjust")
      .set("Authorization", `Bearer ${token}`)
      .send({
        productId: created.id,
        warehouseId: from.id,
        operation: "IN",
        quantity: 10,
        reason: "phase11-adjust",
        referenceDocument: "P11-ADJ",
      });

    expect(adjustRes.status).toBe(200);
    expect(adjustRes.body.success).toBe(true);
    expect(adjustRes.body.data.level.quantityOnHand).toBe(10);

    const transferRes = await request(app)
      .post("/api/inventory/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        productId: created.id,
        fromWarehouseId: from.id,
        toWarehouseId: to.id,
        quantity: 4,
        reason: "phase11-transfer",
        referenceDocument: "P11-XFER",
      });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.success).toBe(true);

    const levelsRes = await request(app)
      .get(`/api/inventory/levels?productId=${created.id}&pageSize=20`)
      .set("Authorization", `Bearer ${token}`);

    expect(levelsRes.status).toBe(200);

    const levels = levelsRes.body.data as Array<{
      warehouseId: string;
      quantityOnHand: number;
    }>;

    const fromLevel = levels.find((level) => level.warehouseId === from.id);
    const toLevel = levels.find((level) => level.warehouseId === to.id);

    expect(fromLevel?.quantityOnHand).toBe(6);
    expect(toLevel?.quantityOnHand).toBe(4);

    await prisma.product.update({
      where: { id: created.id },
      data: { deletedAt: new Date() },
    });
  });
});
