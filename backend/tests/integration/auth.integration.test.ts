import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { uniqueEmail } from "./helpers";

describe("Auth integration", () => {
  it("registers and logs in a user", async () => {
    const email = uniqueEmail("auth-int");
    const password = "Phase11Pass123";

    const registerRes = await request(app).post("/api/auth/register").send({
      email,
      fullName: "Phase 11 Auth Test",
      password,
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.user.email).toBe(email);
    expect(registerRes.body.data.accessToken).toBeTypeOf("string");

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.email).toBe(email);
    expect(loginRes.body.data.accessToken).toBeTypeOf("string");
  });

  it("rejects invalid credentials", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: uniqueEmail("missing"),
      password: "WrongPassword1",
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
  });
});
