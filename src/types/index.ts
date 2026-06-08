import type { Role } from "@prisma/client";

export type { Role };

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};
