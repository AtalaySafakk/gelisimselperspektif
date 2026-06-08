import type { RequestMeta } from "@/types";

export function getRequestMetaFromHeaders(headers: Headers): RequestMeta {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    undefined;
  return {
    ipAddress: ip,
    userAgent: headers.get("user-agent") ?? undefined,
  };
}
