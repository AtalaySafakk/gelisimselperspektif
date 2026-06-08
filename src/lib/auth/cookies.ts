import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseDurationToMs } from "@/lib/auth/tokens";
import { getServerEnv } from "@/lib/env";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cookie-names";

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };

const isProd = process.env.NODE_ENV === "production";

function accessMaxAgeSeconds(): number {
  return Math.floor(parseDurationToMs(getServerEnv().JWT_ACCESS_EXPIRES) / 1000);
}

function refreshMaxAgeSeconds(): number {
  return Math.floor(parseDurationToMs(getServerEnv().JWT_REFRESH_EXPIRES) / 1000);
}

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAgeSeconds(),
  });
  jar.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: refreshMaxAgeSeconds(),
  });
}

export function applyAuthCookiesToResponse(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
): NextResponse {
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAgeSeconds(),
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: refreshMaxAgeSeconds(),
  });
  return response;
}

export async function clearAuthCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete({
    name: REFRESH_TOKEN_COOKIE,
    path: "/api/auth",
  });
}

export function clearAuthCookiesOnResponse(response: NextResponse): NextResponse {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete({
    name: REFRESH_TOKEN_COOKIE,
    path: "/api/auth",
  });
  return response;
}

export async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(REFRESH_TOKEN_COOKIE)?.value;
}
