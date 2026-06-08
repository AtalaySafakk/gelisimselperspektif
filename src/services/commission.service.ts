import { CommissionScope, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/env";

/**
 * Default platform fee — reads DEFAULT_PLATFORM_FEE_PERCENT from env.
 * Fallback: 20%. Configurable without code change.
 */
function defaultFee(): number {
  try {
    return getServerEnv().DEFAULT_PLATFORM_FEE_PERCENT;
  } catch {
    return 20;
  }
}

/**
 * Resolve the applicable commission percent for a sale.
 * Priority: COURSE > INSTRUCTOR > GLOBAL > default 20%
 */
export const commissionService = {
  async resolvePercent(courseId: string, instructorId: string): Promise<number> {
    const now = new Date();
    const baseWhere: Prisma.CommissionRuleWhereInput = {
      isActive: true,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    };

    const courseRule = await prisma.commissionRule.findFirst({
      where: { ...baseWhere, scope: CommissionScope.COURSE, courseId },
      orderBy: { effectiveFrom: "desc" },
    });
    if (courseRule) return Number(courseRule.percent);

    const instructorRule = await prisma.commissionRule.findFirst({
      where: { ...baseWhere, scope: CommissionScope.INSTRUCTOR, instructorId },
      orderBy: { effectiveFrom: "desc" },
    });
    if (instructorRule) return Number(instructorRule.percent);

    const globalRule = await prisma.commissionRule.findFirst({
      where: { ...baseWhere, scope: CommissionScope.GLOBAL },
      orderBy: { effectiveFrom: "desc" },
    });
    if (globalRule) return Number(globalRule.percent);

    return defaultFee();
  },

  compute(gross: number, platformFeePercent: number) {
    const platformFeeAmount = (gross * platformFeePercent) / 100;
    const instructorNetAmount = gross - platformFeeAmount;
    return {
      grossAmount: gross,
      platformFeePercent,
      platformFeeAmount: Math.round(platformFeeAmount * 100) / 100,
      instructorNetAmount: Math.round(instructorNetAmount * 100) / 100,
    };
  },
};
