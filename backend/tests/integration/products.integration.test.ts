import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { loginAdmin, uniqueSku } from "./helpers";

describe("Products integration", () => {
  it("creates, updates, and deletes a product", async () => {
    const token = await loginAdmin();
    const sku = uniqueSku("P11");

    const createRes = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        sku,
        name: "Phase11 Product",
        category: "Testing",
        brand: "InveXa",
        description: "integration product",
        unitPrice: 49.99,
        costPrice: 21.5,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.sku).toBe(sku);

    const productId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .put(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Phase11 Product Updated",
        category: "Testing",
        brand: "InveXa",
        description: "updated",
        unitPrice: 52.25,
        costPrice: 23.0,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("Phase11 Product Updated");

    const listRes = await request(app).get(`/api/products?search=${encodeURIComponent(sku)}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const deleteRes = await request(app)
      .delete(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
  });
});
