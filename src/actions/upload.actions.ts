"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/guards";
import { Role } from "@prisma/client";
import { toActionError } from "@/lib/errors/service-error";
import { prisma } from "@/lib/db/prisma";
import { uploadService } from "@/services/upload.service";
import { paymentService } from "@/services/payment.service";
import type { ActionResult } from "@/types";

/** Confirm receipt upload + transition payment to UNDER_REVIEW */
export async function confirmReceiptAndSubmitAction(
  paymentId: string,
  storageKey: string,
  // orderId reserved for future revalidatePath(checkout/orderId) — not needed server-side
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await uploadService.assertR2ObjectMatchesPolicy(storageKey, "receipt");
    await paymentService.setReceipt(paymentId, user.id, storageKey);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

/** Confirm thumbnail upload after direct R2 PUT */
export async function confirmThumbnailUploadAction(
  courseId: string,
  storageKey: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    await uploadService.confirmThumbnailUpload(courseId, user.id, user.role, storageKey);
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: { slug: true },
    });
    revalidatePath("/courses");
    revalidatePath("/instructor/courses");
    revalidatePath(`/instructor/courses/${courseId}`);
    if (course?.slug) revalidatePath(`/courses/${course.slug}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

/** Confirm document upload after direct R2 PUT */
export async function confirmDocumentUploadAction(
  lessonId: string,
  storageKey: string,
  fileName: string,
  fileSizeBytes?: number,
): Promise<ActionResult> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    await uploadService.confirmDocumentUpload(lessonId, user.id, user.role, storageKey, fileName, {
      fileSizeBytes: fileSizeBytes ?? null,
    });
    const moduleRow = await prisma.module.findFirst({
      where: { lessons: { some: { id: lessonId } } },
      select: { courseId: true },
    });
    if (moduleRow) revalidatePath(`/instructor/courses/${moduleRow.courseId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

/** Confirm video upload after direct R2 PUT */
export async function confirmVideoUploadAction(
  lessonId: string,
  storageKey: string,
  mimeType?: string,
  fileSizeBytes?: number,
): Promise<ActionResult> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    await uploadService.confirmVideoUpload(lessonId, user.id, user.role, storageKey, {
      mimeType,
      fileSizeBytes: fileSizeBytes ?? null,
    });
    const moduleRow = await prisma.module.findFirst({
      where: { lessons: { some: { id: lessonId } } },
      select: { courseId: true },
    });
    if (moduleRow) revalidatePath(`/instructor/courses/${moduleRow.courseId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}
