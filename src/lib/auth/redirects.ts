import { Role } from "@prisma/client";

/** Rol bazlı panel (öğrenim / eğitmen / admin) giriş yolu */
export function getPanelPathForRole(role: Role): string {
  switch (role) {
    case Role.SUPER_ADMIN:
    case Role.ADMIN:
      return "/admin";
    case Role.INSTRUCTOR:
      return "/instructor";
    case Role.STUDENT:
    default:
      return "/learn";
  }
}

/** @deprecated getPanelPathForRole kullanın */
export const getHomePathForRole = getPanelPathForRole;
