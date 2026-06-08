import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getServerEnv } from "@/lib/env";
import type { Role } from "@prisma/client";

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  role: Role;
  emailVerified: boolean;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  familyId: string;
}

function accessSecret() {
  return new TextEncoder().encode(getServerEnv().JWT_ACCESS_SECRET);
}

function refreshSecret() {
  return new TextEncoder().encode(getServerEnv().JWT_REFRESH_SECRET);
}

export type AccessTokenSignInput = {
  sub: string;
  email: string;
  role: Role;
  emailVerified: boolean;
};

export async function signAccessToken(
  payload: AccessTokenSignInput,
): Promise<string> {
  const { JWT_ACCESS_EXPIRES } = getServerEnv();
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    emailVerified: payload.emailVerified,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_ACCESS_EXPIRES)
    .sign(accessSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret());
  return payload as AccessTokenPayload;
}

export type RefreshTokenSignInput = {
  sub: string;
  familyId: string;
};

export async function signRefreshToken(
  payload: RefreshTokenSignInput,
): Promise<string> {
  const { JWT_REFRESH_EXPIRES } = getServerEnv();
  return new SignJWT({ familyId: payload.familyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_REFRESH_EXPIRES)
    .sign(refreshSecret());
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, refreshSecret());
  return payload as RefreshTokenPayload;
}
