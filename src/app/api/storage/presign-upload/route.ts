import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { isR2Configured } from "@/lib/env";
import { uploadService } from "@/services/upload.service";
import { ServiceError } from "@/lib/errors/service-error";

const bodySchema = z.discriminatedUnion("uploadType", [
  z.object({
    uploadType: z.literal("receipt"),
    orderId: z.string().cuid(),
    contentType: z.string(),
    contentLength: z.number().positive(),
  }),
  z.object({
    uploadType: z.literal("thumbnail"),
    courseId: z.string().cuid(),
    contentType: z.string(),
    contentLength: z.number().positive(),
  }),
  z.object({
    uploadType: z.literal("document"),
    lessonId: z.string().cuid(),
    contentType: z.string(),
    contentLength: z.number().positive(),
  }),
  z.object({
    uploadType: z.literal("video"),
    lessonId: z.string().cuid(),
    contentType: z.string(),
    contentLength: z.number().positive(),
  }),
  z.object({
    uploadType: z.literal("accessApplication"),
    applicationId: z.string().cuid(),
    contentType: z.string(),
    contentLength: z.number().positive(),
  }),
  z.object({
    uploadType: z.literal("courseEnrollmentApplication"),
    applicationId: z.string().cuid(),
    contentType: z.string(),
    contentLength: z.number().positive(),
  }),
  z.object({
    uploadType: z.literal("heroSlide"),
    slideId: z.string().cuid(),
    contentType: z.string(),
    contentLength: z.number().positive(),
  }),
]);

/**
 * POST /api/storage/presign-upload
 * Returns a presigned PUT URL for direct R2 upload.
 * Auth required. Ownership checked per upload type.
 */
export async function POST(request: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Dosya yükleme şu an yapılandırılmamış. Yöneticiye bildirin." },
      { status: 503 },
    );
  }

  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Geçersiz istek gövdesi" },
      { status: 400 },
    );
  }

  if (
    user.role === Role.STUDENT &&
    parsed.data.uploadType !== "receipt" &&
    parsed.data.uploadType !== "accessApplication" &&
    parsed.data.uploadType !== "courseEnrollmentApplication"
  ) {
    return NextResponse.json(
      { error: "Öğrenci hesaplarıyla bu türde dosya yüklenemez." },
      { status: 403 },
    );
  }

  try {
    const data = parsed.data;
    let result: { url: string; key: string; expiresIn: number };

    if (data.uploadType === "receipt") {
      result = await uploadService.presignReceiptUpload(
        data.orderId,
        user.id,
        data.contentType,
        data.contentLength,
      );
    } else if (data.uploadType === "thumbnail") {
      result = await uploadService.presignThumbnailUpload(
        data.courseId,
        user.id,
        user.role,
        data.contentType,
        data.contentLength,
      );
    } else if (data.uploadType === "document") {
      result = await uploadService.presignDocumentUpload(
        data.lessonId,
        user.id,
        user.role,
        data.contentType,
        data.contentLength,
      );
    } else if (data.uploadType === "accessApplication") {
      result = await uploadService.presignAccessApplicationUpload(
        data.applicationId,
        user.id,
        data.contentType,
        data.contentLength,
      );
    } else if (data.uploadType === "courseEnrollmentApplication") {
      result = await uploadService.presignCourseEnrollmentApplicationUpload(
        data.applicationId,
        user.id,
        data.contentType,
        data.contentLength,
      );
    } else if (data.uploadType === "heroSlide") {
      result = await uploadService.presignHeroSlideUpload(
        data.slideId,
        user.role,
        data.contentType,
        data.contentLength,
      );
    } else {
      result = await uploadService.presignVideoUpload(
        data.lessonId,
        user.id,
        user.role,
        data.contentType,
        data.contentLength,
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ServiceError) {
      const status = e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    console.error("[presign-upload]", e);
    return NextResponse.json({ error: "Sunucu hatası. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
