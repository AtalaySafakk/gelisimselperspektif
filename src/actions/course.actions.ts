"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Role } from "@prisma/client";
import { requireAuth, requirePermission, requireRole } from "@/lib/auth/guards";
import { getRequestMetaFromHeaders } from "@/lib/auth/request-meta";
import { toActionError } from "@/lib/errors/service-error";
import { courseService } from "@/services/course.service";
import { moduleService } from "@/services/module.service";
import { lessonService } from "@/services/lesson.service";
import { courseCategoryService } from "@/services/course-category.service";
import {
  courseUpsertSchema,
  courseRejectSchema,
  moduleSchema,
  lessonVideoSchema,
  lessonLiveSchema,
  lessonDocumentSchema,
  categorySchema,
} from "@/validators/course";
import { LessonType, CourseDeliveryMode } from "@prisma/client";
import type { ActionResult } from "@/types";

async function meta() {
  return getRequestMetaFromHeaders(await headers());
}

function revalidateCoursePaths(slug?: string) {
  revalidatePath("/courses");
  revalidatePath("/instructor/courses");
  revalidatePath("/admin/courses");
  if (slug) revalidatePath(`/courses/${slug}`);
}

export async function createCourseAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = courseUpsertSchema.safeParse({
      ...raw,
      categoryId: raw.categoryId || null,
      deliveryMode:
        raw.deliveryMode && (Object.values(CourseDeliveryMode) as string[]).includes(raw.deliveryMode)
          ? (raw.deliveryMode as CourseDeliveryMode)
          : undefined,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const course = await courseService.create(user.id, parsed.data, await meta());
    revalidateCoursePaths(course.slug);
    redirect(`/instructor/courses/${course.id}`);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { success: false, error: toActionError(e) };
  }
}

export async function updateCourseAction(
  courseId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData) as Record<string, string>;
    const parsed = courseUpsertSchema.safeParse({
      ...raw,
      categoryId: raw.categoryId || null,
      deliveryMode:
        raw.deliveryMode && (Object.values(CourseDeliveryMode) as string[]).includes(raw.deliveryMode)
          ? (raw.deliveryMode as CourseDeliveryMode)
          : undefined,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const course = await courseService.update(
      courseId,
      user.id,
      user.role,
      parsed.data,
      await meta(),
    );
    revalidateCoursePaths(course.slug);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function submitCourseForReviewAction(
  courseId: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    await courseService.submitForReview(courseId, user.id, user.role, await meta());
    revalidateCoursePaths();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function publishCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("courses.moderate");
    await courseService.publish(courseId, user.id, await meta());
    revalidateCoursePaths();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function rejectCourseAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("courses.moderate");
    const parsed = courseRejectSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await courseService.reject(
      parsed.data.courseId,
      user.id,
      parsed.data.rejectionReason,
      await meta(),
    );
    revalidateCoursePaths();
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function deleteCourseAction(courseId: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await courseService.softDelete(courseId, user.id, user.role, await meta());
    revalidateCoursePaths();
    redirect("/instructor/courses");
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { success: false, error: toActionError(e) };
  }
}

export async function createModuleAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    const parsed = moduleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await moduleService.create(user.id, user.role, parsed.data, await meta());
    revalidatePath(`/instructor/courses/${parsed.data.courseId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function createLessonAction(
  formData: FormData,
): Promise<ActionResult<{ lessonId: string }>> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    const raw = Object.fromEntries(formData);
    const type = raw.lessonType as LessonType;
    const schema =
      type === LessonType.VIDEO
        ? lessonVideoSchema
        : type === LessonType.LIVE
          ? lessonLiveSchema
          : lessonDocumentSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const d = parsed.data;
    const created = await lessonService.create(
      user.id,
      user.role,
      {
        moduleId: d.moduleId,
        title: d.title,
        description: d.description,
        lessonType: d.lessonType,
        order: d.order,
        isFreePreview: d.isFreePreview,
        durationMinutes: d.durationMinutes,
        video:
          d.lessonType === LessonType.VIDEO
            ? {
                storageKey: "storageKey" in d && d.storageKey ? d.storageKey : undefined,
                durationSeconds: "durationSeconds" in d ? d.durationSeconds : undefined,
              }
            : undefined,
        live:
          d.lessonType === LessonType.LIVE
            ? {
                platform: d.platform,
                meetingUrl: d.meetingUrl,
                meetingPassword: d.meetingPassword,
                startsAt: new Date(d.startsAt),
                joinAvailableAt: new Date(d.joinAvailableAt),
                durationMinutes: d.durationMinutes,
                timezone: d.timezone,
              }
            : undefined,
        document:
          d.lessonType === LessonType.DOCUMENT
            ? {
                storageKey: "storageKey" in d && d.storageKey ? d.storageKey : undefined,
                fileName: "fileName" in d && d.fileName ? d.fileName : undefined,
              }
            : undefined,
      },
      await meta(),
    );
    const moduleRow = await import("@/lib/db/prisma").then((m) =>
      m.prisma.module.findUnique({ where: { id: d.moduleId } }),
    );
    if (moduleRow) revalidatePath(`/instructor/courses/${moduleRow.courseId}`);
    return { success: true, data: { lessonId: created.id } };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function createCategoryAction(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("courses.moderate");
    const parsed = categorySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await courseCategoryService.create(parsed.data);
    revalidatePath("/admin/courses");
    revalidatePath("/courses");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}
