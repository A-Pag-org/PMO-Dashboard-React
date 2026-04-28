// FILE: src/lib/auth.ts
// PURPOSE: Client-side demo auth replacing Next middleware + /auth/login + /logout route handlers.
// Keeps the "auth=demo" cookie contract from the original Next.js app.
// TODO: replace with real auth (NextAuth / server-backed sessions) when backend lands.

const COOKIE_NAME = 'auth';
const COOKIE_VALUE = 'demo';
const ROLE_COOKIE = 'role';
const MAX_AGE_SECONDS = 60 * 60 * 24;

/**
 * Known user roles. Most map rules apply to every role; a few (Delhi-specific
 * behaviour, default-state mapping) key off these names. Defaults to 'MoHUA'
 * when no role cookie is set.
 */
export type UserRole = 'MoHUA' | 'DPCC' | 'CS – Delhi' | 'Admin';

export const KNOWN_ROLES: UserRole[] = ['MoHUA', 'DPCC', 'CS – Delhi', 'Admin'];

export function isAuthenticated(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .some((c) => c === `${COOKIE_NAME}=${COOKIE_VALUE}`);
}

export function signIn(role: UserRole = 'MoHUA'): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
  document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function signOut(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Returns the active role from the cookie, falling back to MoHUA. */
export function getCurrentRole(): UserRole {
  if (typeof document === 'undefined') return 'MoHUA';
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ROLE_COOKIE}=`));
  if (!match) return 'MoHUA';
  const raw = decodeURIComponent(match.slice(ROLE_COOKIE.length + 1));
  return (KNOWN_ROLES as string[]).includes(raw) ? (raw as UserRole) : 'MoHUA';
}

/**
 * Spec MAP_002 — DPCC and "CS – Delhi" only see RTO-level toggles (and only
 * when the area filter is Delhi). All other roles see the standard set.
 */
export function isDelhiOnlyRole(role: UserRole): boolean {
  return role === 'DPCC' || role === 'CS – Delhi';
}
