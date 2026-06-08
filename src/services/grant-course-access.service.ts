import {
  CourseAccessStatus,
  OrderStatus,
  WalletTransactionType,
  WalletBalanceType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";
import { commissionService } from "@/services/commission.service";
import { auditLogService } from "@/services/audit-log.service";
import type { RequestMeta } from "@/types";

/**
 * Single entry point for granting course access after a confirmed payment.
 * Works for both manual (bank transfer receipt) and future automatic (webhook) flows.
 *
 * IDEMPOTENCY: İçerideki transaction'da updateMany ile sipariş PAID yapılmadan önce kilitlenir.
 * İkinci eşzamanlı çağrı audit veya ledger yazmaz (CourseAccess/CommissionSnapshot tek kalır).
 *
 * Transaction guarantees:
 *   1. Order → PAID (optimistic lock — skips if already PAID)
 *   2. CourseAccess ACTIVE  (DB unique constraint on orderId backs this up)
 *   3. OrderCommissionSnapshot (DB unique constraint on orderId)
 *   4. WalletBalance upsert + WalletTransaction SALE_CREDIT (append-only)
 *   5. Audit: COURSE_ACCESS_GRANTED + WALLET_CREDITED
 */
export const grantCourseAccessService = {
  async grant(orderId: string, actorId: string, meta?: RequestMeta) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { course: true },
    });

    if (!order) throw new ServiceError("Sipariş bulunamadı.", "NOT_FOUND");
    if (order.status === OrderStatus.CANCELLED) {
      throw new ServiceError("İptal edilmiş sipariş onaylanamaz.");
    }
    // Ödemesi tamamlanmış ama erişim kaydı yoksa — sessiz no-op yerine açık hata
    if (order.status === OrderStatus.PAID) {
      const existingAccess = await prisma.courseAccess.findUnique({
        where: { orderId },
      });
      if (existingAccess) {
        return;
      }
      throw new ServiceError(
        "Sipariş ödenmiş görünüyor ancak kurs erişimi kaydı eksik. Lütfen destek ile iletişime geçin.",
        "CONFLICT",
      );
    }

    // Resolve commission BEFORE tx (read-only, avoids deadlock)
    const platformFeePercent = await commissionService.resolvePercent(
      order.courseId,
      order.instructorId,
    );
    const { grossAmount, platformFeeAmount, instructorNetAmount } = commissionService.compute(
      Number(order.total),
      platformFeePercent,
    );

    await prisma.$transaction(async (tx) => {
      // ── Optimistic lock ──────────────────────────────────────────────────
      // Only proceeds if order is NOT yet PAID. Concurrent calls will find
      // count === 0 and safely return without double-processing.
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: { not: OrderStatus.PAID } },
        data: { status: OrderStatus.PAID, paidAt: new Date() },
      });
      if (updated.count === 0) return; // already processed — idempotent exit

      // ── CourseAccess ─────────────────────────────────────────────────────
      // DB unique constraint (orderId) prevents duplicates even on retry.
      const access = await tx.courseAccess.create({
        data: {
          userId: order.studentId,
          courseId: order.courseId,
          orderId,
          status: CourseAccessStatus.ACTIVE,
          grantedAt: new Date(),
        },
      });

      // ── Commission snapshot (immutable) ──────────────────────────────────
      await tx.orderCommissionSnapshot.create({
        data: {
          orderId,
          grossAmount,
          platformFeePercent,
          platformFeeAmount,
          instructorNetAmount,
          currency: order.currency,
        },
      });

      // ── Instructor wallet credit (append-only ledger) ─────────────────
      const walletBalance = await tx.walletBalance.upsert({
        where: { userId: order.instructorId },
        create: {
          userId: order.instructorId,
          availableBalance: instructorNetAmount,
          pendingBalance: 0,
          totalEarned: instructorNetAmount,
          totalWithdrawn: 0,
          currency: order.currency,
        },
        update: {
          availableBalance: { increment: instructorNetAmount },
          totalEarned: { increment: instructorNetAmount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletBalanceId: walletBalance.id,
          userId: order.instructorId,
          type: WalletTransactionType.SALE_CREDIT,
          amount: instructorNetAmount,
          balanceType: WalletBalanceType.AVAILABLE,
          // balanceAfter reflects the state AFTER this increment
          balanceAfter: Number(walletBalance.availableBalance) + instructorNetAmount,
          orderId,
          note: `Satış: ${order.course.title}`,
          metadata: {
            courseId: order.courseId,
            platformFeePercent,
            platformFeeAmount,
            grossAmount,
          },
        },
      });

      // ── Audit logs ───────────────────────────────────────────────────────
      await auditLogService.courseAccessGranted({
        actorId,
        accessId: access.id,
        userId: order.studentId,
        courseId: order.courseId,
        orderId,
      });

      await auditLogService.log({
        actorId,
        action: "WALLET_CREDITED",
        entityType: "USER",
        entityId: order.instructorId,
        metadata: {
          orderId,
          amount: instructorNetAmount,
          platformFeePercent,
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });
    });
  },
};
