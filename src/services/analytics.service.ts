import { CourseAccessStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type AdminDashboardStats = {
  revenue: {
    total: number;
    currency: string;
  };
  studentCount: number;
  topCourses: Array<{
    courseId: string;
    title: string;
    slug: string;
    salesCount: number;
    revenue: number;
  }>;
};

export const analyticsService = {
  async getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const [revenueAgg, studentCount, topCoursesRaw] = await Promise.all([
      prisma.order.aggregate({
        where: { status: OrderStatus.PAID },
        _sum: { total: true },
      }),
      prisma.courseAccess.groupBy({
        by: ["userId"],
        where: { status: CourseAccessStatus.ACTIVE },
      }),
      prisma.order.groupBy({
        by: ["courseId"],
        where: { status: OrderStatus.PAID },
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    const courseIds = topCoursesRaw.map((r) => r.courseId);
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, slug: true },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const topCourses = topCoursesRaw.map((row) => {
      const course = courseMap.get(row.courseId);
      return {
        courseId: row.courseId,
        title: course?.title ?? "—",
        slug: course?.slug ?? "",
        salesCount: row._count.id,
        revenue: Number(row._sum.total ?? 0),
      };
    });

    return {
      revenue: {
        total: Number(revenueAgg._sum.total ?? 0),
        currency: "TRY",
      },
      studentCount: studentCount.length,
      topCourses,
    };
  },
};
