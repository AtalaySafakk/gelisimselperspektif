import { CourseAccessStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";

export const learnService = {
  /** Aktif ve ödemesi tamamlanmış kayıtlı kurslar */
  listEnrolledCourses(userId: string) {
    return prisma.courseAccess.findMany({
      where: {
        userId,
        status: CourseAccessStatus.ACTIVE,
        order: { status: OrderStatus.PAID },
      },
      include: {
        course: {
          include: {
            category: true,
            instructor: { include: { profile: true } },
            modules: {
              where: { deletedAt: null },
              orderBy: { order: "asc" },
              include: {
                lessons: {
                  where: { deletedAt: null },
                  orderBy: { order: "asc" },
                  select: { id: true, title: true, lessonType: true, durationMinutes: true, order: true, isFreePreview: true },
                },
              },
            },
          },
        },
      },
      orderBy: { grantedAt: "desc" },
    });
  },

  /** Verify student has ACTIVE access to a course and return course with full content */
  async getCourseForLearner(slug: string, userId: string) {
    const access = await prisma.courseAccess.findFirst({
      where: {
        userId,
        status: CourseAccessStatus.ACTIVE,
        course: { slug, deletedAt: null },
      },
      include: {
        order: { select: { id: true, status: true } },
        course: {
          include: {
            instructor: { include: { profile: true } },
            category: true,
            modules: {
              where: { deletedAt: null },
              orderBy: { order: "asc" },
              include: {
                lessons: {
                  where: { deletedAt: null },
                  orderBy: { order: "asc" },
                  include: { video: true, liveSession: true, document: true },
                },
              },
            },
          },
        },
      },
    });
    if (!access) throw new ServiceError("Bu kursa erişiminiz yok.", "FORBIDDEN");
    if (access.order.status !== OrderStatus.PAID) {
      throw new ServiceError("Bu kursa erişiminiz yok.", "FORBIDDEN");
    }
    return access.course;
  },

  /** Öğrenme sayfaları / takvim: aktif kayıt ve sipariş PAID */
  async hasAccess(userId: string, courseId: string): Promise<boolean> {
    const access = await prisma.courseAccess.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
      include: { order: { select: { status: true } } },
    });
    return (
      access?.status === CourseAccessStatus.ACTIVE &&
      access?.order.status === OrderStatus.PAID
    );
  },
};
