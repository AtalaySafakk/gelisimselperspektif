import { LessonType, LivePlatform, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { archivedOrderSlot, resolveOrderInsert } from "@/lib/utils/order";
import { ServiceError } from "@/lib/errors/service-error";
import { courseService } from "@/services/course.service";
import { auditLogService } from "@/services/audit-log.service";
import type { RequestMeta } from "@/types";

async function getModuleCourseId(moduleId: string) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, deletedAt: null },
  });
  if (!mod) throw new ServiceError("Modül bulunamadı.", "NOT_FOUND");
  return mod;
}

export const lessonService = {
  async create(
    actorId: string,
    role: Role,
    input: {
      moduleId: string;
      title: string;
      description?: string;
      lessonType: LessonType;
      order?: number;
      isFreePreview?: boolean;
      durationMinutes?: number;
      video?: { storageKey?: string; durationSeconds?: number };
      live?: {
        platform: LivePlatform;
        meetingUrl: string;
        meetingPassword?: string;
        startsAt: Date;
        joinAvailableAt: Date;
        durationMinutes: number;
        timezone?: string;
      };
      document?: { storageKey?: string; fileName?: string };
    },
    meta?: RequestMeta,
  ) {
    const mod = await getModuleCourseId(input.moduleId);
    await courseService.assertCanManage(mod.courseId, actorId, role);

    const existing = await prisma.lesson.findMany({
      where: { moduleId: input.moduleId, deletedAt: null },
      select: { order: true },
    });
    const order = resolveOrderInsert(existing, input.order);

    const lesson = await prisma.$transaction(async (tx) => {
      const created = await tx.lesson.create({
        data: {
          moduleId: input.moduleId,
          title: input.title,
          description: input.description,
          lessonType: input.lessonType,
          order,
          isFreePreview: input.isFreePreview ?? false,
          durationMinutes: input.durationMinutes,
        },
      });

      if (input.lessonType === LessonType.VIDEO) {
        await tx.video.create({
          data: {
            lessonId: created.id,
            storageKey: input.video?.storageKey ?? null,
            durationSeconds: input.video?.durationSeconds,
          },
        });
      } else if (input.lessonType === LessonType.LIVE && input.live) {
        await tx.liveSession.create({
          data: {
            lessonId: created.id,
            platform: input.live.platform,
            title: input.title,
            description: input.description,
            meetingUrl: input.live.meetingUrl,
            meetingPasswordEncrypted: input.live.meetingPassword,
            startsAt: input.live.startsAt,
            joinAvailableAt: input.live.joinAvailableAt,
            durationMinutes: input.live.durationMinutes,
            timezone: input.live.timezone ?? "Europe/Istanbul",
          },
        });
      } else if (
        input.lessonType === LessonType.DOCUMENT &&
        input.document?.storageKey
      ) {
        await tx.documentAsset.create({
          data: {
            lessonId: created.id,
            storageKey: input.document.storageKey,
            fileName: input.document.fileName ?? "dosya.pdf",
          },
        });
      }

      return created;
    });

    await auditLogService.log({
      actorId,
      action: "LESSON_CREATED",
      entityType: "COURSE",
      entityId: mod.courseId,
      metadata: { lessonId: lesson.id, lessonType: input.lessonType },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return lesson;
  },

  async softDelete(lessonId: string, actorId: string, role: Role) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { module: true },
    });
    if (!lesson) throw new ServiceError("Ders bulunamadı.", "NOT_FOUND");
    await courseService.assertCanManage(lesson.module.courseId, actorId, role);
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { deletedAt: new Date(), order: archivedOrderSlot() },
    });
  },
};
