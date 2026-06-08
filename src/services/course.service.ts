import {
  CourseDeliveryMode,
  CourseStatus,
  Role,
  type Course,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { slugify, buildArchivedSlug } from "@/lib/utils/slug";
import { ServiceError } from "@/lib/errors/service-error";
import { auditLogService } from "@/services/audit-log.service";
import type { CourseUpsertInput } from "@/validators/course";
import type { RequestMeta } from "@/types";

/** Full include — only for authenticated instructor/admin contexts */
const ownerInclude = {
  category: true,
  instructor: { include: { profile: true, instructorProfile: true } },
  requiredAccessRoles: {
    include: { accessRole: { select: {

        id: true,
        name: true,
        slug: true,
      } } },
  },
  modules: {
    where: { deletedAt: null },
    orderBy: { order: "asc" as const },
    include: {
      lessons: {
        where: { deletedAt: null },
        orderBy: { order: "asc" as const },
        include: { video: true, liveSession: true, document: true },
      },
    },
  },
} satisfies Prisma.CourseInclude;

/**
 * Stripped include for the public course detail page.
 * Intentionally excludes storage keys (video, document, liveSession.meetingUrl)
 * to avoid leaking private asset URLs to unauthenticated visitors.
 */
const publicDetailInclude = {
  category: true,
  instructor: { include: { profile: true, instructorProfile: true } },
  requiredAccessRoles: {
    include: { accessRole: { select: { id: true, name: true, slug: true } } },
  },
  modules: {
    where: { deletedAt: null },
    orderBy: { order: "asc" as const },
    include: {
      lessons: {
        where: { deletedAt: null },
        orderBy: { order: "asc" as const },
        select: {
          id: true,
          title: true,
          lessonType: true,
          isFreePreview: true,
          durationMinutes: true,
          order: true,
        },
      },
    },
  },
} satisfies Prisma.CourseInclude;

export const courseService = {
  async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = slugify(base);
    if (!slug) slug = "kurs";
    let candidate = slug;
    let n = 0;
    while (true) {
      const existing = await prisma.course.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      n += 1;
      candidate = `${slug}-${n}`;
    }
  },

  async assertCanManage(
    courseId: string,
    actorId: string,
    role: Role,
  ): Promise<Course> {
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });
    if (!course) throw new ServiceError("Kurs bulunamadı.", "NOT_FOUND");
    const isAdmin = role === Role.ADMIN || role === Role.SUPER_ADMIN;
    if (!isAdmin && course.instructorId !== actorId) {
      throw new ServiceError("Bu kursa erişim yetkiniz yok.", "FORBIDDEN");
    }
    return course;
  },

  listPublished(filters?: {
    categorySlug?: string;
    search?: string;
    take?: number;
  }) {
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.PUBLISHED,
      deletedAt: null,
    };
    if (filters?.categorySlug) {
      where.category = { slug: filters.categorySlug, isActive: true };
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { shortDescription: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    return prisma.course.findMany({
      where,
      include: {
        category: true,
        instructor: { include: { profile: true, instructorProfile: true } },
      },
      orderBy: { publishedAt: "desc" },
      ...(filters?.take != null ? { take: filters.take } : {}),
    });
  },

  /** Public page — returns lesson metadata only, no storage keys */
  getPublishedBySlugPublic(slug: string) {
    return prisma.course.findFirst({
      where: { slug, status: CourseStatus.PUBLISHED, deletedAt: null },
      include: publicDetailInclude,
    });
  },

  listForInstructor(instructorId: string) {
    return prisma.course.findMany({
      where: { instructorId, deletedAt: null },
      include: { category: true },
      orderBy: { updatedAt: "desc" },
    });
  },

  listForAdmin(status?: CourseStatus) {
    return prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      include: {
        category: true,
        instructor: { include: { profile: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  /** Full data — for owner/admin contexts only. No auth check here; caller must verify. */
  getById(id: string) {
    return prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: ownerInclude,
    });
  },

  /**
   * Service-level ownership guard.
   * Use this instead of getById() when the caller needs to ensure the actor
   * is the owner (instructor) or an admin before receiving full course data.
   */
  async getByIdForOwner(id: string, actorId: string, role: Role) {
    const course = await this.getById(id);
    if (!course) return null;
    const isAdmin = role === Role.ADMIN || role === Role.SUPER_ADMIN;
    if (!isAdmin && course.instructorId !== actorId) return null;
    return course;
  },

  parseTags(tags?: string): string[] {
    if (!tags) return [];
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  },

  async create(
    instructorId: string,
    input: CourseUpsertInput,
    meta?: RequestMeta,
  ) {
    const slug = await this.ensureUniqueSlug(input.title);
    const course = await prisma.course.create({
      data: {
        instructorId,
        title: input.title,
        slug,
        description: input.description,
        shortDescription: input.shortDescription,
        categoryId: input.categoryId || null,
        price: input.price,
        discountPrice: input.discountPrice ?? null,
        difficulty: input.difficulty,
        deliveryMode: input.deliveryMode ?? CourseDeliveryMode.OFFLINE,
        tags: this.parseTags(input.tags),
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
        status: CourseStatus.DRAFT,
      },
    });

    await auditLogService.log({
      actorId: instructorId,
      action: "COURSE_CREATED",
      entityType: "COURSE",
      entityId: course.id,
      metadata: { slug: course.slug },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return course;
  },

  async update(
    courseId: string,
    actorId: string,
    role: Role,
    input: CourseUpsertInput,
    meta?: RequestMeta,
  ) {
    const course = await this.assertCanManage(courseId, actorId, role);
    if (
      course.status === CourseStatus.PUBLISHED &&
      role !== Role.ADMIN &&
      role !== Role.SUPER_ADMIN
    ) {
      throw new ServiceError(
        "Yayınlanmış kurs güncellenemez. Önce arşivleyin veya admin ile iletişime geçin.",
      );
    }

    const slug =
      course.title !== input.title
        ? await this.ensureUniqueSlug(input.title, courseId)
        : course.slug;

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: input.title,
        slug,
        description: input.description,
        shortDescription: input.shortDescription,
        categoryId: input.categoryId || null,
        price: input.price,
        discountPrice: input.discountPrice ?? null,
        difficulty: input.difficulty,
        deliveryMode: input.deliveryMode ?? CourseDeliveryMode.OFFLINE,
        tags: this.parseTags(input.tags),
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
      },
    });

    await auditLogService.log({
      actorId,
      action: "COURSE_UPDATED",
      entityType: "COURSE",
      entityId: courseId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return updated;
  },

  async softDelete(courseId: string, actorId: string, role: Role, meta?: RequestMeta) {
    const course = await this.assertCanManage(courseId, actorId, role);
    const archivedSlug = buildArchivedSlug(course.slug, course.id);
    await prisma.course.update({
      where: { id: courseId },
      data: {
        deletedAt: new Date(),
        slug: archivedSlug,
        status: CourseStatus.ARCHIVED,
      },
    });
    await auditLogService.log({
      actorId,
      action: "COURSE_ARCHIVED",
      entityType: "COURSE",
      entityId: courseId,
      metadata: { archivedSlug },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
  },

  async submitForReview(
    courseId: string,
    actorId: string,
    role: Role,
    meta?: RequestMeta,
  ) {
    const course = await this.assertCanManage(courseId, actorId, role);
    if (
      course.status !== CourseStatus.DRAFT &&
      course.status !== CourseStatus.REJECTED
    ) {
      throw new ServiceError("Bu kurs incelemeye gönderilemez.");
    }
    const moduleCount = await prisma.module.count({
      where: { courseId, deletedAt: null },
    });
    if (moduleCount === 0) {
      throw new ServiceError("En az bir modül ekleyin.");
    }
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PENDING_REVIEW, rejectionReason: null },
    });
    await auditLogService.log({
      actorId,
      action: "COURSE_SUBMITTED_FOR_REVIEW",
      entityType: "COURSE",
      entityId: courseId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return updated;
  },

  async publish(courseId: string, actorId: string, meta?: RequestMeta) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });
    if (!course) throw new ServiceError("Kurs bulunamadı.", "NOT_FOUND");
    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new ServiceError("Yalnızca incelemedeki kurslar yayınlanabilir.");
    }
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        status: CourseStatus.PUBLISHED,
        publishedAt: new Date(),
        rejectionReason: null,
      },
    });
    await auditLogService.coursePublished({
      actorId,
      courseId,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return updated;
  },

  async reject(
    courseId: string,
    actorId: string,
    rejectionReason: string,
    meta?: RequestMeta,
  ) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });
    if (!course) throw new ServiceError("Kurs bulunamadı.", "NOT_FOUND");
    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new ServiceError("Yalnızca incelemedeki kurslar reddedilebilir.");
    }
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.REJECTED, rejectionReason },
    });
    await auditLogService.log({
      actorId,
      action: "COURSE_REJECTED",
      entityType: "COURSE",
      entityId: courseId,
      metadata: { rejectionReason },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });
    return updated;
  },

  async archive(courseId: string, actorId: string, role: Role, meta?: RequestMeta) {
    await this.softDelete(courseId, actorId, role, meta);
  },
};
