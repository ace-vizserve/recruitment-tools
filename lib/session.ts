/**
 * Two passwords, two levels of access. The internal password opens every
 * tool; the client one opens the reports page and nothing else, so a report
 * can be handed to a client without handing over the outreach tools with it.
 */
export type Role = "internal" | "client";

/**
 * Each role's token is a hash of its own password under its own salt. The
 * cookie therefore proves which role it is without carrying the password, and
 * without carrying a claim the browser could edit.
 *
 * Internal keeps the original salt deliberately: changing it would sign out
 * every session that already exists, for no gain.
 */
const ROLE_CONFIG: Record<Role, { env: "APP_PASSWORD" | "CLIENT_APP_PASSWORD"; salt: string }> = {
  internal: { env: "APP_PASSWORD", salt: "-mrf-salt" },
  client: { env: "CLIENT_APP_PASSWORD", salt: "-mrf-client-salt" },
};

/**
 * Internal first. If both env vars are ever set to the same string, the more
 * capable role wins rather than an admin being silently downgraded.
 */
const ROLES: Role[] = ["internal", "client"];

export async function getSessionToken(role: Role = "internal") {
  const { env, salt } = ROLE_CONFIG[role];
  const password = process.env[env];
  if (!password) return null;

  // Create a hash of the password to use as the session token
  const msgBuffer = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/** The role a cookie value proves, or null when it proves nothing. */
export async function resolveRole(token: string | null | undefined): Promise<Role | null> {
  if (!token) return null;

  for (const role of ROLES) {
    const expected = await getSessionToken(role);
    if (expected && token === expected) return role;
  }

  return null;
}

/**
 * The role a submitted password unlocks, or null when it matches neither.
 *
 * The empty checks are load-bearing: without them an unset env var is
 * `undefined`, and a request that omits `password` entirely would compare
 * `undefined === undefined` and log in.
 */
export async function roleForPassword(password: unknown): Promise<Role | null> {
  if (typeof password !== "string" || password.length === 0) return null;

  for (const role of ROLES) {
    const expected = process.env[ROLE_CONFIG[role].env];
    if (expected && password === expected) return role;
  }

  return null;
}
