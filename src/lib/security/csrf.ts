export function verifyCsrfOrigin(req: Request): { ok: boolean; reason?: string } {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const fetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") {
    return { ok: false, reason: "Cross-site request blocked (Sec-Fetch-Site)." };
  }

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const requestHost = (
        req.headers.get("x-forwarded-host") ||
        req.headers.get("host") ||
        new URL(req.url).host
      ).toLowerCase();
      if (originHost !== requestHost) {
        return { ok: false, reason: "Origin mismatch." };
      }
    } catch {
      return { ok: false, reason: "Malformed Origin header." };
    }
  }

  return { ok: true };
}
