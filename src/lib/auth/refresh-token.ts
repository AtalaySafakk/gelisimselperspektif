import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/tokens";

/** Ham token asla DB'ye yazılmaz — yalnızca hash saklanır. */
export function hashRefreshToken(raw: string): string {
  return hashToken(raw);
}

/** Aynı familyId altındaki tüm aktif refresh tokenları iptal et (reuse saldırısı). */
export async function revokeRefreshTokenFamily(familyId: string): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}
