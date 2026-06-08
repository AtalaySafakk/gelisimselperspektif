import {
  CourseEnrollmentApplicationStatus,
  CourseEnrollmentMode,
  CourseStatus,
  OrderStatus,
} from "@prisma/client";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";
import { auditLogService } from "@/services/audit-log.service";
import { orderService } from "@/services/order.service";

const INVITE_TTL_DAYS = 30;

const applicationInclude = {
  course: {
    select: {
      id: true,
      title: true,
      slug: true,
      enrollmentMode: true,
      price: true,
      discountPrice: true,
    },
  },
  documents: true,
  reviewedBy: { include: { profile: true } },
  order: {
    select: {
      id: true,
      status: true,
      paymentInviteToken: true,
      paymentInviteExpiresAt: true,
      total: true,
    },
  },
} as const;

export const courseEnrollmentApplicationService = {
  async createApplication(userId: string, courseId: string, note?: string | null) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
        deletedAt: null,
        enrollmentMode: CourseEnrollmentMode.APPLICATION,
      },
    });
    if (!course) {
      throw new ServiceError("Bu eğitim başvuru ile kayıt gerektirmiyor veya bulunamadı.", "NOT_FOUND");
    }

    const access = await prisma.courseAccess.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (access) {
      throw new ServiceError("Bu kursa zaten erişiminiz var.", "CONFLICT");
    }

    const pending = await prisma.courseEnrollmentApplication.findFirst({
      where: { userId, courseId, status: CourseEnrollmentApplicationStatus.PENDING },
    });
    if (pending) {
      throw new ServiceError("Bu eğitim için zaten bekleyen bir başvurunuz var.", "CONFLICT");
    }

    return prisma.courseEnrollmentApplication.create({
      data: {
        userId,
        courseId,
        note: note?.trim() || null,
        status: CourseEnrollmentApplicationStatus.PENDING,
      },
      include: applicationInclude,
    });
  },

  async attachDocument(
    applicationId: string,
    userId: string,
    doc: { storageKey: string; fileName: string; mimeType: string; fileSizeBytes?: bigint },
  ) {
    const app = await prisma.courseEnrollmentApplication.findFirst({
      where: {
        id: applicationId,
        userId,
        status: CourseEnrollmentApplicationStatus.PENDING,
      },
    });
    if (!app) throw new ServiceError("Başvuru bulunamadı veya düzenlenemez.", "NOT_FOUND");

    return prisma.courseEnrollmentApplicationDocument.create({
      data: {
        applicationId,
        storageKey: doc.storageKey,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSizeBytes: doc.fileSizeBytes ?? null,
      },
    });
  },

  listForUser(userId: string) {
    return prisma.courseEnrollmentApplication.findMany({
      where: { userId },
      include: applicationInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  async getForUserAndCourse(userId: string, courseId: string) {
    return prisma.courseEnrollmentApplication.findFirst({
      where: { userId, courseId },
      include: applicationInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  listForAdmin(status?: CourseEnrollmentApplicationStatus, courseId?: string) {
    return prisma.courseEnrollmentApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(courseId ? { courseId } : {}),
      },
      include: {
        ...applicationInclude,
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async approve(applicationId: string, reviewerId: string) {
    const app = await prisma.courseEnrollmentApplication.findUnique({
      where: { id: applicationId },
      include: { course: true },
    });
    if (!app) throw new ServiceError("Başvuru bulunamadı.", "NOT_FOUND");
    if (app.status !== CourseEnrollmentApplicationStatus.PENDING) {
      throw new ServiceError("Bu başvuru bekleyen durumda değil.", "CONFLICT");
    }
    if (app.course.enrollmentMode !== CourseEnrollmentMode.APPLICATION) {
      throw new ServiceError("Bu kurs başvuru modunda değil.", "BAD_REQUEST");
    }

    const access = await prisma.courseAccess.findUnique({
      where: { userId_courseId: { userId: app.userId, courseId: app.courseId } },
    });
    if (access) throw new ServiceError("Öğrencinin bu kursa zaten erişimi var.", "CONFLICT");

    const existingOrder = await prisma.order.findFirst({
      where: {
        studentId: app.userId,
        courseId: app.courseId,
        status: { in: [OrderStatus.PENDING, OrderStatus.AWAITING_APPROVAL, OrderStatus.PAID] },
      },
    });
    if (existingOrder) {
      throw new ServiceError("Bu öğrenci için aktif bir sipariş zaten var.", "CONFLICT");
    }

    const inviteToken = nanoid(32);
    const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const order = await orderService.createFromApprovedApplication({
      studentId: app.userId,
      course: app.course,
      paymentInviteToken: inviteToken,
      paymentInviteExpiresAt: inviteExpiresAt,
    });

    await prisma.courseEnrollmentApplication.update({
      where: { id: applicationId },
      data: {
        status: CourseEnrollmentApplicationStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        orderId: order.id,
      },
    });

    await auditLogService.log({
      actorId: reviewerId,
      action: "COURSE_ENROLLMENT_APPLICATION_APPROVED",
      entityType: "COURSE_ENROLLMENT_APPLICATION",
      entityId: applicationId,
      metadata: {
        applicantUserId: app.userId,
        courseId: app.courseId,
        courseSlug: app.course.slug,
        orderId: order.id,
      },
    });

    await auditLogService.log({
      actorId: reviewerId,
      action: "PAYMENT_INVITE_ISSUED",
      entityType: "ORDER",
      entityId: order.id,
      metadata: {
        applicantUserId: app.userId,
        courseId: app.courseId,
        applicationId,
        paymentInviteExpiresAt: inviteExpiresAt.toISOString(),
      },
    });

    return order;
  },

  async reject(applicationId: string, reviewerId: string, reviewNote?: string | null) {
    const app = await prisma.courseEnrollmentApplication.findUnique({
      where: { id: applicationId },
      include: { course: true },
    });
    if (!app) throw new ServiceError("Başvuru bulunamadı.", "NOT_FOUND");
    if (app.status !== CourseEnrollmentApplicationStatus.PENDING) {
      throw new ServiceError("Bu başvuru bekleyen durumda değil.", "CONFLICT");
    }

    const note = reviewNote?.trim() || null;
    await prisma.courseEnrollmentApplication.update({
      where: { id: applicationId },
      data: {
        status: CourseEnrollmentApplicationStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });

    await auditLogService.log({
      actorId: reviewerId,
      action: "COURSE_ENROLLMENT_APPLICATION_REJECTED",
      entityType: "COURSE_ENROLLMENT_APPLICATION",
      entityId: applicationId,
      metadata: {
        applicantUserId: app.userId,
        courseId: app.courseId,
        courseSlug: app.course.slug,
        reviewNote: note,
      },
    });
  },

  async getByInviteToken(token: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { paymentInviteToken: token },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            discountPrice: true,
            instructor: { select: { profile: { select: { displayName: true } } } },
          },
        },
        payments: { orderBy: { createdAt: "desc" } },
        enrollmentApplication: true,
      },
    });
    if (!order) throw new ServiceError("Geçersiz ödeme linki.", "NOT_FOUND");
    if (order.studentId !== userId) {
      throw new ServiceError("Bu ödeme linki size ait değil.", "FORBIDDEN");
    }
    if (order.paymentInviteExpiresAt && order.paymentInviteExpiresAt < new Date()) {
      throw new ServiceError("Ödeme linkinin süresi dolmuş. Destek ile iletişime geçin.", "BAD_REQUEST");
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new ServiceError("Bu sipariş iptal edilmiş.", "BAD_REQUEST");
    }
    return order;
  },

  async setEnrollmentMode(courseId: string, mode: CourseEnrollmentMode) {
    const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw new ServiceError("Kurs bulunamadı.", "NOT_FOUND");
    return prisma.course.update({
      where: { id: courseId },
      data: { enrollmentMode: mode },
    });
  },
};
