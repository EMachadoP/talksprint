import { describe, it, expect } from "vitest";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { POST as conversationPost } from "@/app/api/conversation/route";
import { POST as pronunciationPost } from "@/app/api/pronunciation/route";
import { POST as checkpointPost } from "@/app/api/checkpoint/route";
import {
  GET as privacyGet,
  PATCH as privacyPatch,
  DELETE as privacyDelete,
} from "@/app/api/privacy/route";

async function registerSyntheticUser(label: string, ip: string) {
  const email = `sec-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const res = await registerPost(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({
        displayName: `User ${label}`,
        email,
        password: "StrongPassword123!",
      }),
    })
  );
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
  const body = await res.json();
  return { email, cookie, pseudonymId: body.user.pseudonymId as string };
}

describe("Security Regression Suite (SEC-001 through SEC-007)", () => {
  it("SEC-001: rejects unauthenticated calls to AI and privacy endpoints with 401", async () => {
    const convRes = await conversationPost(
      new Request("http://localhost/api/conversation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ utterance: "Hello", taskId: "hotel-problem" }),
      })
    );
    expect(convRes.status).toBe(401);

    const pronRes = await pronunciationPost(
      new Request("http://localhost/api/pronunciation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetPhrase: "Hello world", transcript: "Hello world" }),
      })
    );
    expect(pronRes.status).toBe(401);

    const chkRes = await checkpointPost(
      new Request("http://localhost/api/checkpoint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          weekNumber: 8,
          trainedTaskId: "hotel-problem",
          userResponseText: "Excuse me, could you help me with my reservation?",
        }),
      })
    );
    expect(chkRes.status).toBe(401);

    const privDel = await privacyDelete(
      new Request("http://localhost/api/privacy", { method: "DELETE" })
    );
    expect(privDel.status).toBe(401);
  });

  it("SEC-001b: rejects disallowed audioMimeType (e.g. image/svg+xml) in /api/pronunciation", async () => {
    const user = await registerSyntheticUser("mime", "10.1.0.2");
    const res = await pronunciationPost(
      new Request("http://localhost/api/pronunciation", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: user.cookie,
          "x-forwarded-for": "10.1.0.2",
        },
        body: JSON.stringify({
          targetPhrase: "I work with a team.",
          audioBase64: "PHN2Zz48L3N2Zz4=",
          audioMimeType: "image/svg+xml",
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("SEC-004: blocks cross-site CSRF mutations via Sec-Fetch-Site and Origin mismatch", async () => {
    const user = await registerSyntheticUser("csrf", "10.1.0.3");

    const crossSiteRes = await privacyPatch(
      new Request("http://localhost/api/privacy", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: user.cookie,
          "sec-fetch-site": "cross-site",
        },
        body: JSON.stringify({ pronunciationPortfolioOptIn: true }),
      })
    );
    expect(crossSiteRes.status).toBe(403);

    const originMismatchRes = await privacyPatch(
      new Request("http://localhost/api/privacy", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: user.cookie,
          origin: "https://attacker.example",
          host: "talksprint.vercel.app",
        },
        body: JSON.stringify({ pronunciationPortfolioOptIn: true }),
      })
    );
    expect(originMismatchRes.status).toBe(403);
  });

  it("SEC-005: enforces per-account rate limiting on /api/auth/login", async () => {
    const email = `lockout-${Date.now()}@example.com`;
    let got429 = false;
    for (let i = 0; i < 10; i++) {
      const res = await loginPost(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": `10.2.0.${i + 1}`, // rotate IP to verify account-level limit
          },
          body: JSON.stringify({ email, password: "WrongPassword!" }),
        })
      );
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });

  it("SEC-007: revokes session server-side on logout so stolen cookie cannot be reused", async () => {
    const user = await registerSyntheticUser("revoke", "10.1.0.4");

    const beforeLogout = await privacyGet(
      new Request("http://localhost/api/privacy", {
        method: "GET",
        headers: { cookie: user.cookie },
      })
    );
    expect(beforeLogout.status).toBe(200);

    const logoutRes = await logoutPost(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: user.cookie },
      })
    );
    expect(logoutRes.status).toBe(200);

    const afterLogout = await privacyGet(
      new Request("http://localhost/api/privacy", {
        method: "GET",
        headers: { cookie: user.cookie },
      })
    );
    expect(afterLogout.status).toBe(401);
  });

  it("Multi-tenant isolation: User A mutations never leak to User B", async () => {
    const userA = await registerSyntheticUser("tenantA", "10.1.0.5");
    const userB = await registerSyntheticUser("tenantB", "10.1.0.6");
    expect(userA.pseudonymId).not.toBe(userB.pseudonymId);

    const patchA = await privacyPatch(
      new Request("http://localhost/api/privacy", {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: userA.cookie },
        body: JSON.stringify({ pronunciationPortfolioOptIn: true }),
      })
    );
    expect(patchA.status).toBe(200);

    const getB = await privacyGet(
      new Request("http://localhost/api/privacy", {
        method: "GET",
        headers: { cookie: userB.cookie },
      })
    );
    const bodyB = await getB.json();
    expect(bodyB.pseudonymId).toBe(userB.pseudonymId);
    expect(bodyB.pronunciationPortfolioOptIn).toBe(false);
  });
});
