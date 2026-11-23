export type SecurityAuditEventType =
  | "AUTH_REGISTER"
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILURE"
  | "AUTH_LOGOUT"
  | "AUTH_RATE_LIMITED"
  | "CSRF_BLOCKED"
  | "PRIVACY_PORTFOLIO_CHANGED"
  | "PRIVACY_DATA_DELETED";

export function logSecurityEvent(params: {
  event: SecurityAuditEventType;
  ip: string;
  pseudonymId?: string | null;
  detail?: string;
}): void {
  if (process.env.VITEST === "true") return;
  const entry = {
    level: "security_audit",
    timestamp: new Date().toISOString(),
    event: params.event,
    ip: params.ip,
    pseudonymId: params.pseudonymId ?? null,
    detail: params.detail ?? null,
  };
  console.info(JSON.stringify(entry));
}
