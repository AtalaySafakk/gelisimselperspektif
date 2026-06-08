const BLOCKED_PREFIXES = [
  "/api/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

/** Middleware / refresh redirect döngüsünü önler. */
export function sanitizeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = "/",
): string {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback;
  }
  if (BLOCKED_PREFIXES.some((p) => callbackUrl === p || callbackUrl.startsWith(`${p}/`))) {
    return fallback;
  }
  return callbackUrl;
}
