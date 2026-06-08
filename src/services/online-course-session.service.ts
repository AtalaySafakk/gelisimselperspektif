import { CourseAccessStatus, OrderStatus, type LivePlatform } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";

export const onlineCourseSessionService = {
  /**
   * Öğrenci: yalnızca PAID + aktif kayıt ve yayınlanmış oturumlar.
   * Ödeme/kayıt yoksa boş döner (toplantı linki sızmasın).
   */
  async listForPaidEnrolledLearner(courseId: string, userId: string) {
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

    return prisma.onlineCourseSession.findMany({
      where: { courseId, isPublished: true },
      orderBy: { startsAt: "asc" },
    });
  },

  listForCourseAdmin(courseId: string) {
    return prisma.onlineCourseSession.findMany({
      where: { courseId },
      orderBy: { startsAt: "asc" },
    });
  },

  async create(
    courseId: string,
    data: {
      title: string;
      description?: string | null;
      platform: LivePlatform;
      meetingUrl: string;
      startsAt: Date;
      durationMinutes: number;
      timezone?: string;
      participantNotes?: string | null;
      isPublished?: boolean;
    },
  ) {
    return prisma.onlineCourseSession.create({
      data: {
        courseId,
        title: data.title,
        description: data.description ?? null,
        platform: data.platform,
        meetingUrl: data.meetingUrl,
        startsAt: data.startsAt,
        durationMinutes: data.durationMinutes,
        timezone: data.timezone ?? "Europe/Istanbul",
        participantNotes: data.participantNotes ?? null,
        isPublished: data.isPublished ?? false,
      },
    });
  },

  async setPublished(sessionId: string, courseId: string, isPublished: boolean) {
    const s = await prisma.onlineCourseSession.findFirst({
      where: { id: sessionId, courseId },
    });
    if (!s) throw new ServiceError("Oturum bulunamadı.", "NOT_FOUND");
    return prisma.onlineCourseSession.update({
      where: { id: sessionId },
      data: { isPublished },
    });
  },

  async delete(sessionId: string, courseId: string) {
    const s = await prisma.onlineCourseSession.findFirst({
      where: { id: sessionId, courseId },
    });
    if (!s) throw new ServiceError("Oturum bulunamadı.", "NOT_FOUND");
    await prisma.onlineCourseSession.delete({ where: { id: sessionId } });
  },
};
