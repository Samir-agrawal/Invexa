import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { countMock, findManyMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    product: {
      count: countMock,
      findMany: findManyMock,
    },
  },
}));

import { listProducts } from "../../src/modules/products/products.service";

describe("products.service unit", () => {
  beforeEach(() => {
    countMock.mockReset();
    findManyMock.mockReset();
  });

  it("returns paginated product data with mapped prices", async () => {
    countMock.mockResolvedValue(3);
    findManyMock.mockResolvedValue([
      {
        id: "p1",
        sku: "SKU-1",
        name: "Product 1",
        category: "Category",
        brand: "Brand",
        description: "Desc",
        unitPrice: new Prisma.Decimal("12.50"),
        costPrice: new Prisma.Decimal("7.10"),
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    const result = await listProducts({
      page: 1,
      pageSize: 2,
      search: undefined,
      category: undefined,
      brand: undefined,
    });

    expect(result.meta.total).toBe(3);
    expect(result.meta.totalPages).toBe(2);
    expect(result.items[0].unitPrice).toBe(12.5);
    expect(result.items[0].costPrice).toBe(7.1);
  });
});
