import type { AuditAction, AuditEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type AuditLogInput = {
  actorId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export const auditLogService = {
  async log(input: AuditLogInput) {
    return prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress ?? undefined,
        userAgent: input.userAgent ?? undefined,
      },
    });
  },

  paymentApproved(params: {
    actorId: string;
    paymentId: string;
    orderId: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "PAYMENT_APPROVED",
      entityType: "PAYMENT",
      entityId: params.paymentId,
      metadata: {
        orderId: params.orderId,
        ...(params.metadata && typeof params.metadata === "object"
          ? (params.metadata as Record<string, unknown>)
          : {}),
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  paymentRejected(params: {
    actorId: string;
    paymentId: string;
    orderId: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "PAYMENT_REJECTED",
      entityType: "PAYMENT",
      entityId: params.paymentId,
      metadata: { orderId: params.orderId, reason: params.reason },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  coursePublished(params: {
    actorId: string;
    courseId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "COURSE_PUBLISHED",
      entityType: "COURSE",
      entityId: params.courseId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  courseAccessGranted(params: {
    actorId?: string | null;
    accessId: string;
    userId: string;
    courseId: string;
    orderId: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "COURSE_ACCESS_GRANTED",
      entityType: "COURSE_ACCESS",
      entityId: params.accessId,
      metadata: {
        userId: params.userId,
        courseId: params.courseId,
        orderId: params.orderId,
      },
    });
  },

  userRegistered(params: {
    actorId: string;
    userId: string;
    email: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "USER_REGISTERED",
      entityType: "USER",
      entityId: params.userId,
      metadata: { email: params.email },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  emailVerified(params: {
    actorId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "EMAIL_VERIFIED",
      entityType: "USER",
      entityId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  passwordResetCompleted(params: {
    actorId: string;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  userLoggedOut(params: {
    actorId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "USER_LOGGED_OUT",
      entityType: "USER",
      entityId: params.actorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  userRoleChanged(params: {
    actorId: string;
    userId: string;
    previousRole: string;
    newRole: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "USER_ROLE_CHANGED",
      entityType: "USER",
      entityId: params.userId,
      metadata: {
        previousRole: params.previousRole,
        newRole: params.newRole,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  liveSessionCreated(params: {
    actorId: string;
    sessionId: string;
    courseId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "LIVE_SESSION_CREATED",
      entityType: "COURSE",
      entityId: params.courseId,
      metadata: { sessionId: params.sessionId },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  liveSessionUpdated(params: {
    actorId: string;
    sessionId: string;
    courseId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "LIVE_SESSION_UPDATED",
      entityType: "COURSE",
      entityId: params.courseId,
      metadata: { sessionId: params.sessionId },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },

  liveSessionDeleted(params: {
    actorId: string;
    sessionId: string;
    courseId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.log({
      actorId: params.actorId,
      action: "LIVE_SESSION_DELETED",
      entityType: "COURSE",
      entityId: params.courseId,
      metadata: { sessionId: params.sessionId },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  },
};
