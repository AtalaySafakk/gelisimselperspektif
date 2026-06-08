import { jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";

export type EdgeAccessPayload = JWTPayload & {
  email: string;
  role: Role;
  emailVerified: boolean;
};

/** Edge-safe JWT verify for middleware (no getServerEnv import chain) */
export async function verifyAccessTokenEdge(
  token: string,
): Promise<EdgeAccessPayload> {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(secret),
  );
  return payload as EdgeAccessPayload;
}
