import { AuthError, getSession, getSessionOrThrow, type SessionUser } from "@/lib/auth/session";
import {
  hasPermission,
  hasRole,
  roleAtLeast,
  type Permission,
} from "@/lib/rbac/permissions";
import type { Role } from "@prisma/client";

export async function requireAuth(): Promise<SessionUser> {
  return getSessionOrThrow();
}

export async function requireRole(
  allowed: Role | Role[],
): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasRole(user.role, allowed)) {
    throw new AuthError("Insufficient role", "FORBIDDEN");
  }
  return user;
}

export async function requireRoleAtLeast(minimum: Role): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roleAtLeast(user.role, minimum)) {
    throw new AuthError("Insufficient role", "FORBIDDEN");
  }
  return user;
}

export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    throw new AuthError("Insufficient permissions", "FORBIDDEN");
  }
  return user;
}

/** Optional auth — returns null if unauthenticated */
export { getSession };
