import request from "supertest";
import { app } from "../../src/app";

export function uniqueEmail(prefix = "user") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
}

export function uniqueSku(prefix = "TST") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

export async function loginAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe123!";

  const res = await request(app).post("/api/auth/login").send({ email, password });

  if (res.status !== 200 || !res.body?.data?.accessToken) {
    throw new Error("Admin login failed for integration tests. Ensure seed data is present.");
  }

  return res.body.data.accessToken as string;
}
