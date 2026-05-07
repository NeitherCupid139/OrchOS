import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyTokenMock = vi.fn();

vi.mock("@clerk/backend", () => ({
  verifyToken: verifyTokenMock,
}));

describe("authenticateRequest", () => {
  beforeEach(() => {
    verifyTokenMock.mockReset();
  });

  it("prefers CLERK_JWT_KEY for networkless verification", async () => {
    verifyTokenMock.mockResolvedValue({
      sub: "user_123",
      org_id: "org_123",
      sid: "sess_123",
    });

    const { authenticateRequest } = await import("./request-auth");

    const auth = await authenticateRequest(new Request("http://localhost", {
      headers: { Authorization: "Bearer test-token" },
    }), {
      jwtKey: "jwt-public-key",
      secretKey: "secret-key",
    });

    expect(verifyTokenMock).toHaveBeenCalledWith("test-token", { jwtKey: "jwt-public-key" });
    expect(auth).toEqual({
      userId: "user_123",
      orgId: "org_123",
      sessionId: "sess_123",
    });
  });

  it("falls back to CLERK_SECRET_KEY when CLERK_JWT_KEY is missing", async () => {
    verifyTokenMock.mockResolvedValue({
      sub: "user_456",
      org_id: null,
      sid: "sess_456",
    });

    const { authenticateRequest } = await import("./request-auth");

    const auth = await authenticateRequest(new Request("http://localhost", {
      headers: { Cookie: "__session=cookie-token" },
    }), {
      jwtKey: "",
      secretKey: "secret-key",
    });

    expect(verifyTokenMock).toHaveBeenCalledWith("cookie-token", { secretKey: "secret-key" });
    expect(auth).toEqual({
      userId: "user_456",
      orgId: null,
      sessionId: "sess_456",
    });
  });

  it("skips verification when no Clerk server keys are configured", async () => {
    const { authenticateRequest } = await import("./request-auth");

    const auth = await authenticateRequest(new Request("http://localhost", {
      headers: { Authorization: "Bearer ignored-token" },
    }), {
      jwtKey: "",
      secretKey: "",
    });

    expect(verifyTokenMock).not.toHaveBeenCalled();
    expect(auth).toEqual({
      userId: null,
      orgId: null,
      sessionId: null,
    });
  });
});
