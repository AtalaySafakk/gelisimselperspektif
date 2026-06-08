import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import {
  REFRESH_TOKEN_COOKIE,
  clearAuthCookiesOnResponse,
} from "@/lib/auth/cookies";
import { verifyAccessTokenEdge } from "@/lib/auth/jwt-edge";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/cookies";
import { getRequestMetaFromHeaders } from "@/lib/auth/request-meta";

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  let actorId: string | undefined;

  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (access) {
    try {
      const payload = await verifyAccessTokenEdge(access);
      actorId = payload.sub;
    } catch {
      /* ignore */
    }
  }

  await authService.logout(
    refresh,
    actorId,
    getRequestMetaFromHeaders(request.headers),
  );

  const response = NextResponse.json({ ok: true });
  return clearAuthCookiesOnResponse(response);
}
