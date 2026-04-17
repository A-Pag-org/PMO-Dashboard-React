// FILE: src/lib/auth.ts
// PURPOSE: Client-side demo auth replacing Next middleware + /auth/login + /logout route handlers.
// Keeps the "auth=demo" cookie contract from the original Next.js app.
// TODO: replace with real auth (NextAuth / server-backed sessions) when backend lands.

const COOKIE_NAME = 'auth';
const COOKIE_VALUE = 'demo';
const MAX_AGE_SECONDS = 60 * 60 * 24;

export function isAuthenticated(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .some((c) => c === `${COOKIE_NAME}=${COOKIE_VALUE}`);
}

export function signIn(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`;
}

export function signOut(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}
