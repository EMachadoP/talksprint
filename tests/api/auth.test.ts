import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";
import { computeReal7DayRetention } from "@/lib/domain/assessment";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";

describe("Real Auth, Sessions & Non-Mocked Metrics", () => {
  it("hashes and verifies passwords with scrypt and signs/verifies HMAC session tokens", () => {
    const hash = hashPassword("SuperSecret123!");
    expect(verifyPassword("SuperSecret123!", hash)).toBe(true);
    expect(verifyPassword("WrongPassword", hash)).toBe(false);

    const token = signSessionToken({
      userId: "u-1",
      pseudonymId: "p-1",
      email: "eldon@example.com",
      displayName: "Eldon",
    });
    const decoded = verifySessionToken(token);
    expect(decoded?.email).toBe("eldon@example.com");
    expect(verifySessionToken(token + "tampered")).toBeNull();
  });

  it("registers a real user and authenticates via POST /api/auth/login", async () => {
    const email = `learner-${Date.now()}@example.com`;
    const regReq = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Eldon",
        email,
        password: "MyStrongPassword123",
      }),
    });
    const regRes = await registerPost(regReq);
    expect(regRes.status).toBe(200);
    expect(regRes.headers.get("set-cookie")).toContain("talksprint_session=");

    const loginReq = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "MyStrongPassword123" }),
    });
    const loginRes = await loginPost(loginReq);
    expect(loginRes.status).toBe(200);
  });

  it("computes real 7-day retention from REVIEW_COMPLETED events (0% when empty)", () => {
    expect(computeReal7DayRetention([])).toBe(0);
    const now = new Date().toISOString();
    expect(
      computeReal7DayRetention([
        {
          eventId: "e1",
          pseudonymId: "p1",
          eventType: "REVIEW_COMPLETED",
          payload: { correct: true },
          occurredAt: now,
        },
        {
          eventId: "e2",
          pseudonymId: "p1",
          eventType: "REVIEW_COMPLETED",
          payload: { correct: false },
          occurredAt: now,
        },
      ])
    ).toBe(50);
  });
});
