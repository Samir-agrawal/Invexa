import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "../../src/config/env";
import { decodeAccessToken } from "../../src/modules/auth/auth.service";

describe("auth.service unit", () => {
  it("decodes a valid access token payload", () => {
    const token = jwt.sign(
      {
        sub: "user-1",
        email: "unit@example.com",
        role: "manager",
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "5m" },
    );

    const decoded = decodeAccessToken(token);

    expect(decoded.sub).toBe("user-1");
    expect(decoded.email).toBe("unit@example.com");
    expect(decoded.role).toBe("manager");
  });

  it("throws unauthorized for malformed token", () => {
    expect(() => decodeAccessToken("not-a-token")).toThrowError("Unauthorized");
  });
});
