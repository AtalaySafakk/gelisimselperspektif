import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import {
  REFRESH_TOKEN_COOKIE,
  applyAuthCookiesToResponse,
  clearAuthCookiesOnResponse,
} from "@/lib/auth/cookies";
import { getRequestMetaFromHeaders } from "@/lib/auth/request-meta";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";

export async function GET(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  const fallback = new URL("/login", request.url);

  if (!refresh) {
    return NextResponse.redirect(fallback);
  }

  try {
    const session = await authService.refreshSession(
      refresh,
      getRequestMetaFromHeaders(request.headers),
    );
    const safePath = sanitizeCallbackUrl(callbackUrl, "/");
    const target = new URL(safePath, request.url);

    const response = NextResponse.redirect(target);
    return applyAuthCookiesToResponse(
      response,
      session.accessToken,
      session.refreshToken,
    );
  } catch {
    const response = NextResponse.redirect(fallback);
    return clearAuthCookiesOnResponse(response);
  }
}

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const session = await authService.refreshSession(
      refresh,
      getRequestMetaFromHeaders(request.headers),
    );
    const response = NextResponse.json({ ok: true });
    return applyAuthCookiesToResponse(
      response,
      session.accessToken,
      session.refreshToken,
    );
  } catch {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return clearAuthCookiesOnResponse(response);
  }
}
