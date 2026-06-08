import { CourseAccessStatus, LivePlatform, OrderStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";
import { courseService } from "@/services/course.service";
import { auditLogService } from "@/services/audit-log.service";
import type { RequestMeta } from "@/types";

export type LiveSessionStatus = "upcoming" | "open" | "ended";

/**
 * Determines join eligibility status from timestamps.
 *
 * canJoin = CourseAccess.ACTIVE && order PAID
 *        && now >= joinAvailableAt
 *        && now <= startsAt + durationMinutes
 */
export function getLiveSessionStatus(
  joinAvailableAt: Date,
  startsAt: Date,
  durationMinutes: number,
): LiveSessionStatus {
  const now = Date.now();
  const endsAt = new Date(startsAt).getTime() + durationMinutes * 60_000;
  if (now < joinAvailableAt.getTime()) return "upcoming";
  if (now > endsAt) return "ended";
  return "open";
}

export type LiveSessionCreateInput = {
  /** courseId to associate via the lesson */
  moduleId: string;
  title: string;
  description?: string;
  platform: LivePlatform;
  meetingUrl: string;
  /** Stored encrypted in production; plaintext acceptable for MVP */
  meetingPassword?: string;
  startsAt: Date;
  /** Must be <= startsAt */
  joinAvailableAt: Date;
  durationMinutes: number;
  timezone?: string;
};

export type LiveSessionUpdateInput = Partial<
  Omit<LiveSessionCreateInput, "moduleId">
>;

const liveSessionWithLesson = {
  lesson: {
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              instructorId: true,
            },
          },
        },
      },
    },
  },
};

export const liveSessionService = {
  // ── Queries ──────────────────────────────────────────────────────────────

  getById(id: string) {
    return prisma.liveSession.findUnique({
      where: { id },
      include: liveSessionWithLesson,
    });
  },

  /** All sessions for a course (instructor/admin view — includes meetingUrl) */
  listForCourse(courseId: string) {
    return prisma.liveSession.findMany({
      where: { lesson: { module: { courseId, deletedAt: null }, deletedAt: null } },
      include: liveSessionWithLesson,
      orderBy: { startsAt: "asc" },
    });
  },

  /** Admin: all upcoming + recent sessions across all courses */
  listForAdmin() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return prisma.liveSession.findMany({
      where: { startsAt: { gte: cutoff } },
      include: {
        ...liveSessionWithLesson,
      },
      orderBy: { startsAt: "asc" },
      take: 100,
    });
  },

  /**
   * Student-safe session list for a course.
   * meetingPassword ve meetingUrl yalnızca PAID + aktif CourseAccess ile döner.
   */
  async listForLearner(courseId: string, userId: string) {
    const access = await prisma.courseAccess.findFirst({
      where: {
        userId,
        courseId,
        status: CourseAccessStatus.ACTIVE,
        order: { status: OrderStatus.PAID },
      },
      select: { id: true },
    });
    if (!access) return [];

    return prisma.liveSession.findMany({
      where: { lesson: { module: { courseId, deletedAt: null }, deletedAt: null } },
      select: {
        id: true,
        title: true,
        description: true,
        platform: true,
        meetingUrl: true,
        meetingPasswordEncrypted: true,
        startsAt: true,
        joinAvailableAt: true,
        durationMinutes: true,
        timezone: true,
        lessonId: true,
      },
      orderBy: { startsAt: "asc" },
    });
  },

  // ── Mutations ─────────────────────────────────────────────────────────────

  async assertCanManageByLessonId(lessonId: string, actorId: string, role: Role) {
    const session = await prisma.liveSession.findUnique({
      where: { lessonId },
      include: liveSessionWithLesson,
    });
    if (!session) throw new ServiceError("Canlı oturum bulunamadı.", "NOT_FOUND");
    const courseId = session.lesson.module.course.id;
    await courseService.assertCanManage(courseId, actorId, role);
    return session;
  },

  /**
   * Update a LiveSession by its lessonId.
   * Validates timing constraints: joinAvailableAt <= startsAt.
   */
  async update(
    lessonId: string,
    actorId: string,
    role: Role,
    input: LiveSessionUpdateInput,
    meta?: RequestMeta,
  ) {
    const session = await this.assertCanManageByLessonId(lessonId, actorId, role);

    const startsAt = input.startsAt ?? session.startsAt;
    const joinAvailableAt = input.joinAvailableAt ?? session.joinAvailableAt;

    if (joinAvailableAt > startsAt) {
      throw new ServiceError(
        "Katılıma açılma zamanı (joinAvailableAt) başlangıç zamanından önce olmalı.",
      );
    }

    const updated = await prisma.liveSession.update({
      where: { lessonId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.platform && { platform: input.platform }),
        ...(input.meetingUrl && { meetingUrl: input.meetingUrl }),
        ...(input.meetingPassword !== undefined && {
          meetingPasswordEncrypted: input.meetingPassword,
        }),
        ...(input.startsAt && { startsAt: input.startsAt }),
        ...(input.joinAvailableAt && { joinAvailableAt: input.joinAvailableAt }),
        ...(input.durationMinutes && { durationMinutes: input.durationMinutes }),
        ...(input.timezone && { timezone: input.timezone }),
      },
    });

    await auditLogService.liveSessionUpdated({
      actorId,
      sessionId: session.id,
      courseId: session.lesson.module.course.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return updated;
  },

  /**
   * Soft-delete a LiveSession by removing its associated Lesson.
   * (LiveSession is 1:1 with Lesson; deleting lesson soft-deletes access to it.)
   */
  async softDelete(
    lessonId: string,
    actorId: string,
    role: Role,
    meta?: RequestMeta,
  ) {
    const session = await this.assertCanManageByLessonId(lessonId, actorId, role);

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { deletedAt: new Date() },
    });

    await auditLogService.liveSessionDeleted({
      actorId,
      sessionId: session.id,
      courseId: session.lesson.module.course.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  },
};
