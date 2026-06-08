import { verifyAccessToken, type AccessTokenPayload } from "@/lib/auth/jwt";
import { getAccessTokenFromCookies } from "@/lib/auth/cookies";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN" = "UNAUTHORIZED",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function payloadToSession(payload: AccessTokenPayload): SessionUser {
  if (!payload.sub) throw new AuthError("Invalid token subject");
  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    emailVerified: payload.emailVerified,
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  try {
    const payload = await verifyAccessToken(token);
    return payloadToSession(payload);
  } catch {
    return null;
  }
}

export async function getSessionOrThrow(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthError("Authentication required");
  return session;
}
