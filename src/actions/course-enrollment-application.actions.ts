"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CourseEnrollmentMode } from "@prisma/client";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { toActionError } from "@/lib/errors/service-error";
import { courseEnrollmentApplicationService } from "@/services/course-enrollment-application.service";
import { uploadService } from "@/services/upload.service";
import { prisma } from "@/lib/db/prisma";
import type { ActionResult } from "@/types";

const applySchema = z.object({
  courseId: z.string().cuid(),
  note: z.string().max(2000).optional(),
});

export async function submitCourseEnrollmentApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ applicationId: string }>> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData);
    const parsed = applySchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const app = await courseEnrollmentApplicationService.createApplication(
      user.id,
      parsed.data.courseId,
      parsed.data.note,
    );
    const course = await prisma.course.findUnique({
      where: { id: parsed.data.courseId },
      select: { slug: true },
    });
    revalidatePath("/learn/course-applications");
    if (course?.slug) revalidatePath(`/courses/${course.slug}`);
    return { success: true, data: { applicationId: app.id } };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function confirmCourseEnrollmentApplicationDocumentAction(
  applicationId: string,
  storageKey: string,
  fileName: string,
  mimeType: string,
  fileSizeBytes?: number,
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await uploadService.assertR2ObjectMatchesPolicy(storageKey, "courseEnrollmentApplication");
    await courseEnrollmentApplicationService.attachDocument(applicationId, user.id, {
      storageKey,
      fileName,
      mimeType: mimeType || "application/octet-stream",
      fileSizeBytes: fileSizeBytes !== undefined ? BigInt(fileSizeBytes) : undefined,
    });
    revalidatePath("/learn/course-applications");
    revalidatePath("/admin/course-applications");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminApproveCourseEnrollmentApplicationAction(
  applicationId: string,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("courses.moderate");
    await courseEnrollmentApplicationService.approve(applicationId, user.id);
    revalidatePath("/admin/course-applications");
    revalidatePath("/learn/course-applications");
    revalidatePath("/courses");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminRejectCourseEnrollmentApplicationAction(
  applicationId: string,
  reviewNote: string,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("courses.moderate");
    await courseEnrollmentApplicationService.reject(applicationId, user.id, reviewNote);
    revalidatePath("/admin/course-applications");
    revalidatePath("/learn/course-applications");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

const enrollmentModeSchema = z.object({
  courseId: z.string().cuid(),
  enrollmentMode: z.enum(["OPEN", "APPLICATION"]),
});

export async function adminSetCourseEnrollmentModeAction(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("courses.moderate");
    const parsed = enrollmentModeSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const course = await prisma.course.findFirst({
      where: { id: parsed.data.courseId, deletedAt: null },
      select: { slug: true },
    });
    if (!course) return { success: false, error: "Kurs bulunamadı." };

    await courseEnrollmentApplicationService.setEnrollmentMode(
      parsed.data.courseId,
      parsed.data.enrollmentMode === "APPLICATION"
        ? CourseEnrollmentMode.APPLICATION
        : CourseEnrollmentMode.OPEN,
    );
    revalidatePath(`/admin/course-gates/${parsed.data.courseId}`);
    revalidatePath(`/courses/${course.slug}`);
    revalidatePath("/courses");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}
