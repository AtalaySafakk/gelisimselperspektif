import {
  AccessRoleApplicationStatus,
  CourseAccessRequirementMode,
  type AccessRole,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";
import { auditLogService } from "@/services/audit-log.service";

export type RequiredAccessRoleRow = {
  accessRoleId: string;
  accessRole: Pick<AccessRole, "id" | "name" | "slug">;
};

export function explainCourseAccessRequirement(
  required: RequiredAccessRoleRow[],
  mode: CourseAccessRequirementMode,
): { intro: string; ruleLine: string; closing: string } {
  const bulletList = required.map((r) => `- ${r.accessRole.name}`).join("\n");
  const intro = `Bu eğitimi satın almak için aşağıdaki uygunluklara sahip olmanız gerekir:\n${bulletList}`;
  const ruleLine =
    mode === CourseAccessRequirementMode.ALL
      ? "Bu rollerin tamamı hesabınızda onaylı olmalıdır."
      : "Bu rollerden en az biri hesabınızda onaylı olmalıdır.";
  const closing = "Başvurunuz onaylandıktan sonra satın alma işlemi aktif olacaktır.";
  return { intro, ruleLine, closing };
}

function throwAccessDenied(
  required: RequiredAccessRoleRow[],
  mode: CourseAccessRequirementMode,
  extra?: string,
): never {
  const { intro, ruleLine, closing } = explainCourseAccessRequirement(required, mode);
  const parts = [intro, "", ruleLine, "", closing];
  if (extra) parts.push("", extra);
  throw new ServiceError(parts.join("\n"), "ACCESS_ROLE_REQUIRED");
}

export const accessRoleService = {
  listActiveCatalog() {
    return prisma.accessRole.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  },

  /** Onaylı erişim rolleri — satın alma kontrolü için */
  async getGrantedRoleIdSet(userId: string): Promise<Set<string>> {
    const rows = await prisma.userAccessRole.findMany({
      where: { userId },
      select: { accessRoleId: true },
    });
    return new Set(rows.map((r) => r.accessRoleId));
  },

  assertUserMeetsCourseRequirements(
    required: RequiredAccessRoleRow[],
    granted: Set<string>,
    mode: CourseAccessRequirementMode,
  ) {
    if (required.length === 0) return;

    if (mode === CourseAccessRequirementMode.ALL) {
      const missing = required.filter((r) => !granted.has(r.accessRoleId));
      if (missing.length === 0) return;
      const missingBullets = missing.map((m) => `- ${m.accessRole.name}`).join("\n");
      throwAccessDenied(required, mode, `Şu an eksik görünen onaylar:\n${missingBullets}`);
    }

    const hasAny = required.some((r) => granted.has(r.accessRoleId));
    if (hasAny) return;
    throwAccessDenied(required, mode);
  },

  async createApplication(userId: string, accessRoleId: string, note?: string | null) {
    const role = await prisma.accessRole.findFirst({
      where: { id: accessRoleId, isActive: true },
    });
    if (!role) throw new ServiceError("Geçersiz veya pasif uygunluk rolü.", "NOT_FOUND");

    const existingGrant = await prisma.userAccessRole.findUnique({
      where: { userId_accessRoleId: { userId, accessRoleId } },
    });
    if (existingGrant) {
      throw new ServiceError("Bu uygunluk rolü zaten hesabınıza tanımlı.", "CONFLICT");
    }

    const pending = await prisma.accessRoleApplication.findFirst({
      where: {
        userId,
        accessRoleId,
        status: AccessRoleApplicationStatus.PENDING,
      },
    });
    if (pending) {
      throw new ServiceError("Bu rol için zaten bekleyen bir başvurunuz var.", "CONFLICT");
    }

    return prisma.accessRoleApplication.create({
      data: {
        userId,
        accessRoleId,
        note: note?.trim() || null,
        status: AccessRoleApplicationStatus.PENDING,
      },
    });
  },

  listApplicationsForUser(userId: string) {
    return prisma.accessRoleApplication.findMany({
      where: { userId },
      include: { accessRole: true, documents: true, reviewedBy: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  listApplicationsForAdmin(status?: AccessRoleApplicationStatus) {
    return prisma.accessRoleApplication.findMany({
      where: status ? { status } : undefined,
      include: {
        accessRole: true,
        user: { include: { profile: true } },
        documents: true,
        reviewedBy: { include: { profile: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async approveApplication(applicationId: string, reviewerId: string) {
    const app = await prisma.accessRoleApplication.findUnique({
      where: { id: applicationId },
      include: { accessRole: true },
    });
    if (!app) throw new ServiceError("Başvuru bulunamadı.", "NOT_FOUND");
    if (app.status !== AccessRoleApplicationStatus.PENDING) {
      throw new ServiceError("Bu başvuru bekleyen durumda değil.", "CONFLICT");
    }

    await prisma.$transaction(async (tx) => {
      await tx.userAccessRole.upsert({
        where: {
          userId_accessRoleId: { userId: app.userId, accessRoleId: app.accessRoleId },
        },
        create: {
          userId: app.userId,
          accessRoleId: app.accessRoleId,
          approvedById: reviewerId,
          manualGrantNote: null,
        },
        update: {
          approvedById: reviewerId,
          approvedAt: new Date(),
          manualGrantNote: null,
        },
      });
      await tx.accessRoleApplication.update({
        where: { id: applicationId },
        data: {
          status: AccessRoleApplicationStatus.APPROVED,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
    });

    await auditLogService.log({
      actorId: reviewerId,
      action: "ACCESS_ROLE_APPLICATION_APPROVED",
      entityType: "ACCESS_ROLE_APPLICATION",
      entityId: applicationId,
      metadata: {
        applicantUserId: app.userId,
        accessRoleId: app.accessRoleId,
        accessRoleSlug: app.accessRole.slug,
        accessRoleName: app.accessRole.name,
      },
    });
  },

  async rejectApplication(applicationId: string, reviewerId: string, reviewNote?: string | null) {
    const app = await prisma.accessRoleApplication.findUnique({
      where: { id: applicationId },
      include: { accessRole: true },
    });
    if (!app) throw new ServiceError("Başvuru bulunamadı.", "NOT_FOUND");
    if (app.status !== AccessRoleApplicationStatus.PENDING) {
      throw new ServiceError("Bu başvuru bekleyen durumda değil.", "CONFLICT");
    }
    const note = reviewNote?.trim() || null;
    await prisma.accessRoleApplication.update({
      where: { id: applicationId },
      data: {
        status: AccessRoleApplicationStatus.REJECTED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });

    await auditLogService.log({
      actorId: reviewerId,
      action: "ACCESS_ROLE_APPLICATION_REJECTED",
      entityType: "ACCESS_ROLE_APPLICATION",
      entityId: applicationId,
      metadata: {
        applicantUserId: app.userId,
        accessRoleId: app.accessRoleId,
        accessRoleSlug: app.accessRole.slug,
        reviewNote: note,
      },
    });
  },

  async grantRoleToUserManually(params: {
    userId: string;
    accessRoleId: string;
    granterId: string;
    manualGrantNote?: string | null;
  }) {
    const role = await prisma.accessRole.findFirst({
      where: { id: params.accessRoleId, isActive: true },
    });
    if (!role) throw new ServiceError("Uygunluk rolü bulunamadı.", "NOT_FOUND");

    const note = (params.manualGrantNote ?? "").trim();
    if (note.length < 5) {
      throw new ServiceError(
        "Rol atarken en az 5 karakterlik kısa bir açıklama girin.",
        "BAD_REQUEST",
      );
    }

    await prisma.userAccessRole.upsert({
      where: {
        userId_accessRoleId: {
          userId: params.userId,
          accessRoleId: params.accessRoleId,
        },
      },
      create: {
        userId: params.userId,
        accessRoleId: params.accessRoleId,
        approvedById: params.granterId,
        manualGrantNote: note,
      },
      update: {
        approvedById: params.granterId,
        approvedAt: new Date(),
        manualGrantNote: note,
      },
    });

    await auditLogService.log({
      actorId: params.granterId,
      action: "ACCESS_ROLE_GRANTED_MANUAL",
      entityType: "USER",
      entityId: params.userId,
      metadata: {
        accessRoleId: params.accessRoleId,
        accessRoleSlug: role.slug,
        accessRoleName: role.name,
        manualGrantNote: note,
      },
    });
  },

  async revokeUserAccessRole(userId: string, accessRoleId: string, actorId: string) {
    const row = await prisma.userAccessRole.findUnique({
      where: { userId_accessRoleId: { userId, accessRoleId } },
      include: { accessRole: true },
    });
    if (!row) return;

    await prisma.userAccessRole.deleteMany({
      where: { userId, accessRoleId },
    });

    await auditLogService.log({
      actorId,
      action: "ACCESS_ROLE_REVOKED",
      entityType: "USER",
      entityId: userId,
      metadata: {
        accessRoleId,
        accessRoleSlug: row.accessRole.slug,
        accessRoleName: row.accessRole.name,
      },
    });
  },

  async attachDocument(
    applicationId: string,
    userId: string,
    doc: { storageKey: string; fileName: string; mimeType: string; fileSizeBytes?: bigint },
  ) {
    const app = await prisma.accessRoleApplication.findFirst({
      where: { id: applicationId, userId, status: AccessRoleApplicationStatus.PENDING },
    });
    if (!app) throw new ServiceError("Başvuru bulunamadı veya düzenlenemez.", "NOT_FOUND");

    return prisma.accessRoleApplicationDocument.create({
      data: {
        applicationId,
        storageKey: doc.storageKey,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSizeBytes: doc.fileSizeBytes ?? null,
      },
    });
  },

  async setCourseAccessRequirements(
    courseId: string,
    accessRoleIds: string[],
    accessRequirementMode: CourseAccessRequirementMode,
  ) {
    const unique = [...new Set(accessRoleIds)];
    if (unique.length > 0) {
      const count = await prisma.accessRole.count({
        where: { id: { in: unique }, isActive: true },
      });
      if (count !== unique.length) {
        throw new ServiceError("Geçersiz uygunluk rolü seçildi.", "BAD_REQUEST");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id: courseId },
        data: { accessRequirementMode },
      });
      await tx.courseRequiredAccessRole.deleteMany({ where: { courseId } });
      if (unique.length > 0) {
        await tx.courseRequiredAccessRole.createMany({
          data: unique.map((accessRoleId) => ({ courseId, accessRoleId })),
        });
      }
    });
  },

  listUserGrants(userId: string) {
    return prisma.userAccessRole.findMany({
      where: { userId },
      include: { accessRole: true, approvedBy: { include: { profile: true } } },
      orderBy: { approvedAt: "desc" },
    });
  },
};
