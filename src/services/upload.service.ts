import {
  CourseAccessStatus,
  CourseStatus,
  OrderStatus,
  Role,
  AccessRoleApplicationStatus,
  CourseEnrollmentApplicationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  storageKeys,
} from "@/lib/storage/presign";
import { isR2Configured } from "@/lib/env";
import { headR2Object } from "@/lib/storage/r2-head";
import { hasPermission } from "@/lib/rbac/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { nanoid } from "nanoid";

export type UploadType =
  | "receipt"
  | "thumbnail"
  | "document"
  | "video"
  | "accessApplication"
  | "courseEnrollmentApplication"
  | "heroSlide";

type UploadPolicy = {
  allowedMimeTypes: string[];
  maxSizeBytes: number;
};

const POLICIES: Record<UploadType, UploadPolicy> = {
  receipt: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  accessApplication: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxSizeBytes: 10 * 1024 * 1024,
  },
  courseEnrollmentApplication: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maxSizeBytes: 10 * 1024 * 1024,
  },
  thumbnail: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 2 * 1024 * 1024,
  },
  heroSlide: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeBytes: 5 * 1024 * 1024,
  },
  document: {
    allowedMimeTypes: ["application/pdf"],
    maxSizeBytes: 20 * 1024 * 1024,
  },
  video: {
    allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxSizeBytes: 500 * 1024 * 1024,
  },
};

function isPlatformStaff(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

function assertHeroSlideAdmin(actorRole: Role) {
  if (!isPlatformStaff(actorRole)) {
    throw new ServiceError("Bu işlem için admin yetkisi gerekir.", "FORBIDDEN");
  }
}

function canManageCourseContent(
  actorId: string,
  actorRole: Role,
  courseInstructorId: string,
): boolean {
  return isPlatformStaff(actorRole) || courseInstructorId === actorId;
}

function isS3NotFound(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return err.name === "NotFound" || err.$metadata?.httpStatusCode === 404;
}

export const uploadService = {
  /**
   * R2 HeadObject ile boyut + Content-Type doğrulaması (presign sırasındaki değerlerle).
   * Gerçek magic-byte sniffing yok — MIME hâlâ istemci/PUT ile belirlenir.
   */
  async assertR2ObjectMatchesPolicy(key: string, type: UploadType): Promise<void> {
    if (!isR2Configured()) return;
    try {
      const { contentType, contentLength } = await headR2Object(key);
      validatePolicy(
        type,
        contentType?.split(";")[0]?.trim() ?? "application/octet-stream",
        contentLength,
      );
    } catch (e) {
      if (isS3NotFound(e)) {
        throw new ServiceError(
          "Dosya depoda bulunamadı. Yükleme tamamlanmadan onaylanamaz — lütfen tekrar deneyin.",
          "NOT_FOUND",
        );
      }
      throw e;
    }
  },

  async presignReceiptUpload(
    orderId: string,
    studentId: string,
    contentType: string,
    contentLength: number,
  ) {
    const order = await prisma.order.findFirst({ where: { id: orderId, studentId } });
    if (!order) throw new ServiceError("Sipariş bulunamadı.", "NOT_FOUND");

    validatePolicy("receipt", contentType, contentLength);

    const ext = contentType === "application/pdf" ? "pdf" : "jpg";
    const key = storageKeys.receipt(orderId, `${Date.now()}-${nanoid(8)}.${ext}`);
    return createPresignedUploadUrl({ key, contentType, contentLength });
  },

  async presignThumbnailUpload(
    courseId: string,
    actorId: string,
    actorRole: Role,
    contentType: string,
    contentLength: number,
  ) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
    });
    if (!course) throw new ServiceError("Kurs bulunamadı.", "NOT_FOUND");
    if (!canManageCourseContent(actorId, actorRole, course.instructorId)) {
      throw new ServiceError("Bu kursa erişim yetkiniz yok.", "FORBIDDEN");
    }

    validatePolicy("thumbnail", contentType, contentLength);

    const ext = contentType.split("/")[1] ?? "jpg";
    const key = storageKeys.courseThumbnail(courseId, `${Date.now()}-${nanoid(8)}.${ext}`);
    return createPresignedUploadUrl({ key, contentType, contentLength });
  },

  async presignHeroSlideUpload(
    slideId: string,
    actorRole: Role,
    contentType: string,
    contentLength: number,
  ) {
    assertHeroSlideAdmin(actorRole);
    const slide = await prisma.heroSlide.findUnique({ where: { id: slideId } });
    if (!slide) throw new ServiceError("Slayt bulunamadı.", "NOT_FOUND");

    validatePolicy("heroSlide", contentType, contentLength);

    const ext =
      contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const key = storageKeys.heroSlide(slideId, `${Date.now()}-${nanoid(8)}.${ext}`);
    return createPresignedUploadUrl({ key, contentType, contentLength });
  },

  async presignDocumentUpload(
    lessonId: string,
    actorId: string,
    actorRole: Role,
    contentType: string,
    contentLength: number,
  ) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new ServiceError("Ders bulunamadı.", "NOT_FOUND");
    if (!canManageCourseContent(actorId, actorRole, lesson.module.course.instructorId)) {
      throw new ServiceError("Bu derse erişim yetkiniz yok.", "FORBIDDEN");
    }

    validatePolicy("document", contentType, contentLength);

    const key = storageKeys.lessonDocument(lessonId, `${Date.now()}-${nanoid(8)}.pdf`);
    return createPresignedUploadUrl({ key, contentType, contentLength });
  },

  async presignVideoUpload(
    lessonId: string,
    actorId: string,
    actorRole: Role,
    contentType: string,
    contentLength: number,
  ) {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new ServiceError("Ders bulunamadı.", "NOT_FOUND");
    if (!canManageCourseContent(actorId, actorRole, lesson.module.course.instructorId)) {
      throw new ServiceError("Bu derse erişim yetkiniz yok.", "FORBIDDEN");
    }

    validatePolicy("video", contentType, contentLength);

    const ext = contentType.split("/")[1]?.split(";")[0] ?? "mp4";
    const key = storageKeys.video(lessonId, `${Date.now()}-${nanoid(8)}.${ext}`);
    return createPresignedUploadUrl({ key, contentType, contentLength });
  },

  async presignAccessApplicationUpload(
    applicationId: string,
    studentId: string,
    contentType: string,
    contentLength: number,
  ) {
    const app = await prisma.accessRoleApplication.findFirst({
      where: {
        id: applicationId,
        userId: studentId,
        status: AccessRoleApplicationStatus.PENDING,
      },
    });
    if (!app) throw new ServiceError("Başvuru bulunamadı veya dosya yüklenemez.", "NOT_FOUND");

    validatePolicy("accessApplication", contentType, contentLength);

    const ext =
      contentType === "application/pdf"
        ? "pdf"
        : contentType === "image/png"
          ? "png"
          : contentType === "image/webp"
            ? "webp"
            : "jpg";
    const key = storageKeys.accessApplication(applicationId, `${Date.now()}-${nanoid(8)}.${ext}`);
    return createPresignedUploadUrl({ key, contentType, contentLength });
  },

  async presignCourseEnrollmentApplicationUpload(
    applicationId: string,
    studentId: string,
    contentType: string,
    contentLength: number,
  ) {
    const app = await prisma.courseEnrollmentApplication.findFirst({
      where: {
        id: applicationId,
        userId: studentId,
        status: CourseEnrollmentApplicationStatus.PENDING,
      },
    });
    if (!app) throw new ServiceError("Başvuru bulunamadı veya dosya yüklenemez.", "NOT_FOUND");

    validatePolicy("courseEnrollmentApplication", contentType, contentLength);

    const ext =
      contentType === "application/pdf"
        ? "pdf"
        : contentType === "image/png"
          ? "png"
          : contentType === "image/webp"
            ? "webp"
            : "jpg";
    const key = storageKeys.courseEnrollmentApplication(
      applicationId,
      `${Date.now()}-${nanoid(8)}.${ext}`,
    );
    return createPresignedUploadUrl({ key, contentType, contentLength });
  },

  async signedAccessApplicationDocumentUrl(documentId: string, viewer: SessionUser) {
    const row = await prisma.accessRoleApplicationDocument.findUnique({
      where: { id: documentId },
      include: { application: true },
    });
    if (!row) throw new ServiceError("Belge bulunamadı.", "NOT_FOUND");

    const isOwner = row.application.userId === viewer.id;
    const isAdmin = hasPermission(viewer.role, "users.manage");
    if (!isOwner && !isAdmin) {
      throw new ServiceError("Bu belgeyi görüntüleme yetkiniz yok.", "FORBIDDEN");
    }

    return createPresignedDownloadUrl({
      key: row.storageKey,
      responseContentDisposition: `inline; filename="${encodeURIComponent(row.fileName)}"`,
      expiresIn: 60 * 30,
    });
  },

  async signedCourseEnrollmentApplicationDocumentUrl(documentId: string, viewer: SessionUser) {
    const row = await prisma.courseEnrollmentApplicationDocument.findUnique({
      where: { id: documentId },
      include: { application: true },
    });
    if (!row) throw new ServiceError("Belge bulunamadı.", "NOT_FOUND");

    const isOwner = row.application.userId === viewer.id;
    const isAdmin =
      hasPermission(viewer.role, "users.manage") || hasPermission(viewer.role, "courses.moderate");
    if (!isOwner && !isAdmin) {
      throw new ServiceError("Bu belgeyi görüntüleme yetkiniz yok.", "FORBIDDEN");
    }

    return createPresignedDownloadUrl({
      key: row.storageKey,
      responseContentDisposition: `inline; filename="${encodeURIComponent(row.fileName)}"`,
      expiresIn: 60 * 30,
    });
  },

  /**
   * Dekont: paymentId üzerinden — storageKey URL'de taşınmaz.
   */
  async signedCourseThumbnailUrl(courseId: string, viewer: SessionUser | null) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: { thumbnailStorageKey: true, status: true, instructorId: true },
    });
    if (!course?.thumbnailStorageKey) {
      throw new ServiceError("Kapak görseli yok.", "NOT_FOUND");
    }
    const isPublished = course.status === CourseStatus.PUBLISHED;
    const canManage =
      viewer !== null &&
      canManageCourseContent(viewer.id, viewer.role, course.instructorId);
    if (!isPublished && !canManage) {
      throw new ServiceError("Bu görsele erişim yok.", "FORBIDDEN");
    }
    return createPresignedDownloadUrl({
      key: course.thumbnailStorageKey,
      expiresIn: 60 * 60 * 2,
      responseContentDisposition: "inline",
    });
  },

  /** Yayınlanmış slayt görseli herkese; taslak yalnız admin. */
  async signedHeroSlideImageUrl(slideId: string, viewer: SessionUser | null) {
    const slide = await prisma.heroSlide.findUnique({ where: { id: slideId } });
    if (!slide?.imageStorageKey) {
      throw new ServiceError("Slayt görseli yok.", "NOT_FOUND");
    }
    if (!slide.isActive) {
      if (!viewer || !isPlatformStaff(viewer.role)) {
        throw new ServiceError("Bu görsele erişim yok.", "FORBIDDEN");
      }
    }
    return createPresignedDownloadUrl({
      key: slide.imageStorageKey,
      expiresIn: 60 * 60 * 2,
      responseContentDisposition: "inline",
    });
  },

  async signedReceiptUrlForPayment(paymentId: string, viewer: SessionUser) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment?.receiptStorageKey) {
      throw new ServiceError("Dekont bulunamadı.", "NOT_FOUND");
    }
    const isOwner = payment.order.studentId === viewer.id;
    const isPayAdmin = hasPermission(viewer.role, "payments.approve");
    if (!isOwner && !isPayAdmin) {
      throw new ServiceError("Bu dekontu görüntüleme yetkiniz yok.", "FORBIDDEN");
    }
    return createPresignedDownloadUrl({
      key: payment.receiptStorageKey,
      responseContentDisposition: "inline",
      expiresIn: 60 * 30,
    });
  },

  async signedDocumentUrl(lessonId: string, viewer: SessionUser) {
    const doc = await prisma.documentAsset.findUnique({
      where: { lessonId },
      include: {
        lesson: { include: { module: { include: { course: true } } } },
      },
    });
    if (!doc) throw new ServiceError("Doküman bulunamadı.", "NOT_FOUND");

    const courseId = doc.lesson.module.course.id;
    if (!isPlatformStaff(viewer.role)) {
      const access = await prisma.courseAccess.findUnique({
        where: { userId_courseId: { userId: viewer.id, courseId } },
        include: { order: { select: { status: true } } },
      });
      if (
        access?.status !== CourseAccessStatus.ACTIVE ||
        access.order.status !== OrderStatus.PAID
      ) {
        throw new ServiceError("Bu içeriğe erişim yetkiniz yok.", "FORBIDDEN");
      }
    }

    return createPresignedDownloadUrl({
      key: doc.storageKey,
      responseContentDisposition: `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
    });
  },

  async signedVideoUrl(lessonId: string, viewer: SessionUser) {
    const video = await prisma.video.findUnique({
      where: { lessonId },
      include: {
        lesson: { include: { module: { include: { course: true } } } },
      },
    });
    if (!video?.storageKey) throw new ServiceError("Video bulunamadı.", "NOT_FOUND");

    const courseId = video.lesson.module.course.id;
    if (!isPlatformStaff(viewer.role)) {
      const access = await prisma.courseAccess.findUnique({
        where: { userId_courseId: { userId: viewer.id, courseId } },
        include: { order: { select: { status: true } } },
      });
      if (
        access?.status !== CourseAccessStatus.ACTIVE ||
        access.order.status !== OrderStatus.PAID
      ) {
        throw new ServiceError("Bu içeriğe erişim yetkiniz yok.", "FORBIDDEN");
      }
    }

    return createPresignedDownloadUrl({
      key: video.storageKey,
      expiresIn: 60 * 60 * 4,
    });
  },

  async confirmThumbnailUpload(
    courseId: string,
    actorId: string,
    actorRole: Role,
    storageKey: string,
  ) {
    await this.assertR2ObjectMatchesPolicy(storageKey, "thumbnail");
    const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw new ServiceError("Kurs bulunamadı.", "NOT_FOUND");
    if (!canManageCourseContent(actorId, actorRole, course.instructorId)) {
      throw new ServiceError("Yetkisiz erişim.", "FORBIDDEN");
    }
    return prisma.course.update({
      where: { id: courseId },
      data: { thumbnailStorageKey: storageKey },
    });
  },

  async confirmHeroSlideImageUpload(slideId: string, actorRole: Role, storageKey: string) {
    await this.assertR2ObjectMatchesPolicy(storageKey, "heroSlide");
    assertHeroSlideAdmin(actorRole);
    const slide = await prisma.heroSlide.findUnique({ where: { id: slideId } });
    if (!slide) throw new ServiceError("Slayt bulunamadı.", "NOT_FOUND");
    if (!storageKey.startsWith(`hero-slides/${slideId}/`)) {
      throw new ServiceError("Geçersiz depolama anahtarı.", "BAD_REQUEST");
    }
    return prisma.heroSlide.update({
      where: { id: slideId },
      data: { imageStorageKey: storageKey },
    });
  },

  async confirmDocumentUpload(
    lessonId: string,
    actorId: string,
    actorRole: Role,
    storageKey: string,
    fileName: string,
    opts?: { fileSizeBytes?: number | null },
  ) {
    await this.assertR2ObjectMatchesPolicy(storageKey, "document");
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new ServiceError("Ders bulunamadı.", "NOT_FOUND");
    if (!canManageCourseContent(actorId, actorRole, lesson.module.course.instructorId)) {
      throw new ServiceError("Yetkisiz erişim.", "FORBIDDEN");
    }
    return prisma.documentAsset.upsert({
      where: { lessonId },
      create: {
        lessonId,
        storageKey,
        fileName,
        ...(opts?.fileSizeBytes !== undefined && opts.fileSizeBytes !== null
          ? { fileSizeBytes: BigInt(opts.fileSizeBytes) }
          : {}),
      },
      update: {
        storageKey,
        fileName,
        ...(opts?.fileSizeBytes !== undefined && opts.fileSizeBytes !== null
          ? { fileSizeBytes: BigInt(opts.fileSizeBytes) }
          : {}),
      },
    });
  },

  async confirmVideoUpload(
    lessonId: string,
    actorId: string,
    actorRole: Role,
    storageKey: string,
    opts?: { mimeType?: string; fileSizeBytes?: number | null },
  ) {
    await this.assertR2ObjectMatchesPolicy(storageKey, "video");
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new ServiceError("Ders bulunamadı.", "NOT_FOUND");
    if (!canManageCourseContent(actorId, actorRole, lesson.module.course.instructorId)) {
      throw new ServiceError("Yetkisiz erişim.", "FORBIDDEN");
    }
    const size =
      opts?.fileSizeBytes !== undefined && opts?.fileSizeBytes !== null
        ? BigInt(opts.fileSizeBytes)
        : undefined;
    return prisma.video.upsert({
      where: { lessonId },
      create: {
        lessonId,
        storageKey,
        mimeType: opts?.mimeType,
        ...(size !== undefined ? { fileSizeBytes: size } : {}),
      },
      update: {
        storageKey,
        mimeType: opts?.mimeType,
        ...(size !== undefined ? { fileSizeBytes: size } : {}),
      },
    });
  },
};

function validatePolicy(type: UploadType, contentType: string, sizeBytes: number) {
  const policy = POLICIES[type];
  if (!policy.allowedMimeTypes.includes(contentType)) {
    throw new ServiceError(
      `Bu dosya türü kabul edilmiyor (${contentType}). İzin verilenler: ${policy.allowedMimeTypes.join(", ")}`,
    );
  }
  if (sizeBytes > policy.maxSizeBytes) {
    const maxMb = (policy.maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new ServiceError(`Dosya çok büyük. En fazla ${maxMb} MB yükleyebilirsiniz.`);
  }
  if (sizeBytes <= 0) {
    throw new ServiceError("Dosya boş görünüyor. Lütfen geçerli bir dosya seçin.");
  }
}
