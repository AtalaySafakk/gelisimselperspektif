import { Role } from "@prisma/client";

export const PERMISSIONS = {
  "users.manage": [Role.SUPER_ADMIN, Role.ADMIN],
  "payments.approve": [Role.SUPER_ADMIN, Role.ADMIN],
  "payouts.manage": [Role.SUPER_ADMIN, Role.ADMIN],
  "courses.moderate": [Role.SUPER_ADMIN, Role.ADMIN],
  "courses.own.write": [Role.SUPER_ADMIN, Role.ADMIN, Role.INSTRUCTOR],
  "courses.purchase": [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.INSTRUCTOR,
    Role.STUDENT,
  ],
  "content.watch": [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.INSTRUCTOR,
    Role.STUDENT,
  ],
  "live.join": [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.INSTRUCTOR,
    Role.STUDENT,
  ],
  "wallet.view_own": [Role.SUPER_ADMIN, Role.ADMIN, Role.INSTRUCTOR],
  "settings.manage": [Role.SUPER_ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function hasRole(role: Role, allowed: Role | Role[]): boolean {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(role);
}

export function roleAtLeast(role: Role, minimum: Role): boolean {
  const hierarchy: Role[] = [
    Role.STUDENT,
    Role.INSTRUCTOR,
    Role.ADMIN,
    Role.SUPER_ADMIN,
  ];
  return hierarchy.indexOf(role) >= hierarchy.indexOf(minimum);
}
