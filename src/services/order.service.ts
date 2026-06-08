import { CourseEnrollmentMode, CourseStatus, OrderStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";
import { accessRoleService } from "@/services/access-role.service";

const orderInclude = {
  course: {
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      discountPrice: true,
      thumbnailStorageKey: true,
      instructor: { select: { id: true, profile: { select: { displayName: true } } } },
    },
  },
  payments: { orderBy: { createdAt: "desc" as const } },
  access: true,
} satisfies Prisma.OrderInclude;

export const orderService = {
  /** Create a new order for a student purchasing a course. */
  async create(studentId: string, courseId: string) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, status: CourseStatus.PUBLISHED, deletedAt: null },
      include: {
        requiredAccessRoles: {
          include: { accessRole: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
    if (!course) throw new ServiceError("Kurs bulunamadı veya satışta değil.", "NOT_FOUND");

    if (course.enrollmentMode === CourseEnrollmentMode.APPLICATION) {
      throw new ServiceError("Bu eğitim için önce başvuru gerekir.", "BAD_REQUEST");
    }

    const granted = await accessRoleService.getGrantedRoleIdSet(studentId);
    accessRoleService.assertUserMeetsCourseRequirements(
      course.requiredAccessRoles,
      granted,
      course.accessRequirementMode,
    );

    // Prevent duplicate active orders
    const existing = await prisma.order.findFirst({
      where: {
        studentId,
        courseId,
        status: { in: [OrderStatus.PENDING, OrderStatus.AWAITING_APPROVAL] },
      },
    });
    if (existing) return existing;

    // Prevent duplicate access
    const access = await prisma.courseAccess.findUnique({
      where: { userId_courseId: { userId: studentId, courseId } },
    });
    if (access) throw new ServiceError("Bu kursa zaten erişiminiz var.", "CONFLICT");

    const price = course.discountPrice ?? course.price;
    return prisma.order.create({
      data: {
        studentId,
        courseId,
        instructorId: course.instructorId,
        subtotal: price,
        discountAmount: course.discountPrice ? Number(course.price) - Number(course.discountPrice) : 0,
        total: price,
        currency: course.currency,
        status: OrderStatus.PENDING,
      },
    });
  },

  /** Onaylanmış kurs başvurusundan — yalnızca enrollment approve akışı. */
  createFromApprovedApplication(params: {
    studentId: string;
    course: {
      id: string;
      instructorId: string;
      price: Prisma.Decimal;
      discountPrice: Prisma.Decimal | null;
      currency: Prisma.CourseCreateInput["currency"];
    };
    paymentInviteToken: string;
    paymentInviteExpiresAt: Date;
  }) {
    const price = params.course.discountPrice ?? params.course.price;
    return prisma.order.create({
      data: {
        studentId: params.studentId,
        courseId: params.course.id,
        instructorId: params.course.instructorId,
        subtotal: price,
        discountAmount: params.course.discountPrice
          ? Number(params.course.price) - Number(params.course.discountPrice)
          : 0,
        total: price,
        currency: params.course.currency,
        status: OrderStatus.PENDING,
        paymentInviteToken: params.paymentInviteToken,
        paymentInviteExpiresAt: params.paymentInviteExpiresAt,
      },
    });
  },

  getByInviteToken(token: string) {
    return prisma.order.findFirst({
      where: { paymentInviteToken: token },
      include: orderInclude,
    });
  },

  getById(orderId: string) {
    return prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  },

  getByIdForStudent(orderId: string, studentId: string) {
    return prisma.order.findFirst({
      where: { id: orderId, studentId },
      include: orderInclude,
    });
  },

  listForStudent(studentId: string) {
    return prisma.order.findMany({
      where: { studentId },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
  },

  listAwaitingApproval() {
    return prisma.order.findMany({
      where: { status: OrderStatus.AWAITING_APPROVAL },
      include: {
        ...orderInclude,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        student: { select: { id: true, email: true, profile: true } },
      },
      orderBy: { updatedAt: "asc" },
    });
  },

  async cancel(orderId: string, studentId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, studentId } });
    if (!order) throw new ServiceError("Sipariş bulunamadı.", "NOT_FOUND");
    if (order.status === OrderStatus.PAID) {
      throw new ServiceError("Ödenmiş sipariş iptal edilemez.");
    }
    return prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
    });
  },
};
