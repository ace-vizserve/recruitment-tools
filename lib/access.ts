import type { Role } from "@/lib/session";

/**
 * What a client-password session may reach.
 *
 * Deny by default: anything not named here is internal-only, so a tool added
 * later stays private until somebody deliberately opens it. The alternative —
 * listing what to block — silently exposes every future route.
 *
 * `/api/jobs` is on the list because the reports page needs it for the job
 * picker and the active-job counts. It happens to be the same endpoint the
 * link generator uses, which is why access is decided per route rather than
 * per tool.
 *
 * Type-only import of Role, so this module stays free of the crypto in
 * session.ts and can be imported by the client components that draw the tabs.
 */
const CLIENT_ALLOWED = ["/reports", "/api/reports", "/api/jobs", "/api/logout"];

export function canAccess(role: Role, pathname: string): boolean {
  if (role === "internal") return true;
  return CLIENT_ALLOWED.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}
