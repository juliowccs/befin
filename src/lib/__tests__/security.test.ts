import { beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../../next.config";
import { checkRateLimit, resetRateLimitStore } from "@/lib/rate-limit";

const mockGetSession = vi.fn();
const mockSetPassword = vi.fn();

vi.mock("@/src/lib/auth", () => ({
  authInstance: () => ({
    api: {
      getSession: mockGetSession,
      setPassword: mockSetPassword,
    },
  }),
}));

vi.mock("@/src/db/client", () => ({
  getTursoDb: vi.fn(() => ({
    transaction: vi.fn(),
    select: vi.fn(),
  })),
}));

import { DELETE as accountDelete, GET as accountGet } from "../../../app/api/account/route";
import { POST as passwordPost } from "../../../app/api/account/password/route";
import { POST as syncPost } from "../../../app/api/sync/route";

describe("Security: Rate Limiter", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("blocks requests after reaching the limit and resets after window", () => {
    const now = 1_000_000;
    expect(checkRateLimit("k1", { limit: 2, windowMs: 10_000 }, now).allowed).toBe(true);
    expect(checkRateLimit("k1", { limit: 2, windowMs: 10_000 }, now + 100).allowed).toBe(true);

    const blocked = checkRateLimit("k1", { limit: 2, windowMs: 10_000 }, now + 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    const afterWindow = checkRateLimit("k1", { limit: 2, windowMs: 10_000 }, now + 10_001);
    expect(afterWindow.allowed).toBe(true);
  });
});

describe("Security: API AuthN, Rate Limit, Payload Size & Error Masking", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.clearAllMocks();
  });

  it("returns 401 for all protected endpoints when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const syncRes = await syncPost(
      new Request("http://localhost/api/sync", { method: "POST", body: "{}" }),
    );
    expect(syncRes.status).toBe(401);

    const exportRes = await accountGet(
      new Request("http://localhost/api/account", { method: "GET" }),
    );
    expect(exportRes.status).toBe(401);

    const deleteRes = await accountDelete(
      new Request("http://localhost/api/account", { method: "DELETE" }),
    );
    expect(deleteRes.status).toBe(401);

    const pwdRes = await passwordPost(
      new Request("http://localhost/api/account/password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "valid-password-123" }),
      }),
    );
    expect(pwdRes.status).toBe(401);
  });

  it("rejects oversized /api/sync payloads with 413", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });

    const headerOversized = await syncPost(
      new Request("http://localhost/api/sync", {
        method: "POST",
        headers: { "content-length": String(3 * 1024 * 1024) },
        body: "{}",
      }),
    );
    expect(headerOversized.status).toBe(413);

    const bigBody = JSON.stringify({
      last_synced_at: 0,
      changes: { banks: [{ name: "a".repeat(2 * 1024 * 1024 + 100) }] },
    });
    const bodyOversized = await syncPost(
      new Request("http://localhost/api/sync", {
        method: "POST",
        body: bigBody,
      }),
    );
    expect(bodyOversized.status).toBe(413);
  });

  it("enforces rate limiting and masks internal error details on /api/account/password", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-pwd" } });
    mockSetPassword.mockRejectedValue(new Error("SQLITE_BUSY: internal table lock"));

    const res = await passwordPost(
      new Request("http://localhost/api/account/password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "valid-password-123" }),
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Não foi possível definir a senha.");
    expect(json.error).not.toContain("SQLITE_BUSY");

    // Exhaust remaining 4 attempts (limit is 5)
    for (let i = 0; i < 4; i++) {
      await passwordPost(
        new Request("http://localhost/api/account/password", {
          method: "POST",
          body: JSON.stringify({ newPassword: "valid-password-123" }),
        }),
      );
    }

    const rateLimited = await passwordPost(
      new Request("http://localhost/api/account/password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "valid-password-123" }),
      }),
    );
    expect(rateLimited.status).toBe(429);
    expect(rateLimited.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("Security: Next.js HTTP Headers", () => {
  it("configures essential security headers for all routes", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const rules = await nextConfig.headers!();
    expect(rules.length).toBeGreaterThan(0);

    const rootRule = rules.find((r) => r.source === "/(.*)");
    expect(rootRule).toBeDefined();

    const headerMap = new Map(rootRule!.headers.map((h) => [h.key, h.value]));
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=");
    expect(headerMap.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });
});
