import {
  OrderStatus,
  PaymentProviderType,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";
import { grantCourseAccessService } from "@/services/grant-course-access.service";
import { auditLogService } from "@/services/audit-log.service";
import type { RequestMeta } from "@/types";

export const paymentService = {
  /**
   * Create a PENDING payment record for an order.
   * Called when student lands on the checkout page.
   */
  async createManualPayment(orderId: string, studentId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, studentId } });
    if (!order) throw new ServiceError("Sipariş bulunamadı.", "NOT_FOUND");
    if (order.status === OrderStatus.PAID) {
      throw new ServiceError("Bu sipariş zaten ödenmiş.");
    }

    // Reuse existing pending payment if any
    const existing = await prisma.payment.findFirst({
      where: { orderId, status: { in: [PaymentStatus.PENDING, PaymentStatus.UNDER_REVIEW] } },
    });
    if (existing) return existing;

    return prisma.payment.create({
      data: {
        orderId,
        provider: PaymentProviderType.MANUAL,
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.PENDING,
        amount: order.total,
        currency: order.currency,
      },
    });
  },

  /**
   * Student uploads a payment receipt.
   * Sets Payment → UNDER_REVIEW and Order → AWAITING_APPROVAL.
   */
  async setReceipt(paymentId: string, studentId: string, receiptStorageKey: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new ServiceError("Ödeme bulunamadı.", "NOT_FOUND");
    if (payment.order.studentId !== studentId) {
      throw new ServiceError("Yetkisiz erişim.", "FORBIDDEN");
    }
    if (payment.status === PaymentStatus.APPROVED) {
      throw new ServiceError("Onaylanmış ödeme güncellenemez.");
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          receiptStorageKey,
          receiptUploadedAt: new Date(),
          status: PaymentStatus.UNDER_REVIEW,
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.AWAITING_APPROVAL },
      }),
    ]);
  },

  /**
   * Admin approves payment → grants course access + credits instructor wallet.
   */
  async approve(paymentId: string, adminId: string, meta?: RequestMeta) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new ServiceError("Ödeme bulunamadı.", "NOT_FOUND");
    if (payment.status === PaymentStatus.APPROVED) {
      throw new ServiceError("Bu ödeme zaten onaylanmış.", "CONFLICT");
    }
    if (payment.status === PaymentStatus.REJECTED) {
      throw new ServiceError("Reddedilmiş ödeme onaylanamaz.");
    }
    // Allow PENDING (admin manual override) and UNDER_REVIEW (normal flow)
    if (
      payment.status !== PaymentStatus.UNDER_REVIEW &&
      payment.status !== PaymentStatus.PENDING
    ) {
      throw new ServiceError("Bu ödeme onaylanabilir durumda değil.");
    }

    // Önce erişim + ledger (grant başarısızsa ödeme APPROVED kalmamalı)
    await grantCourseAccessService.grant(payment.orderId, adminId, meta);

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    await auditLogService.paymentApproved({
      actorId: adminId,
      paymentId,
      orderId: payment.orderId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  },

  /**
   * Admin rejects payment with a reason.
   */
  async reject(paymentId: string, adminId: string, reason: string, meta?: RequestMeta) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new ServiceError("Ödeme bulunamadı.", "NOT_FOUND");
    if (payment.status === PaymentStatus.APPROVED) {
      throw new ServiceError("Onaylanmış ödeme reddedilemez.");
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REJECTED,
        rejectionReason: reason,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    await auditLogService.paymentRejected({
      actorId: adminId,
      paymentId,
      orderId: payment.orderId,
      reason,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  },

  listForAdmin() {
    return prisma.payment.findMany({
      where: {
        status: { in: [PaymentStatus.PENDING, PaymentStatus.UNDER_REVIEW] },
      },
      include: {
        order: {
          include: {
            student: { select: { id: true, email: true, profile: true } },
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
      orderBy: { receiptUploadedAt: "asc" },
    });
  },

  getById(paymentId: string) {
    return prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            student: { select: { id: true, email: true, profile: true } },
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });
  },
};
