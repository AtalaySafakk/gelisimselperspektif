"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LivePlatform, CourseAccessRequirementMode } from "@prisma/client";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { toActionError } from "@/lib/errors/service-error";
import { accessRoleService } from "@/services/access-role.service";
import { onlineCourseSessionService } from "@/services/online-course-session.service";
import { uploadService } from "@/services/upload.service";
import { prisma } from "@/lib/db/prisma";
import type { ActionResult } from "@/types";

const applySchema = z.object({
  accessRoleId: z.string().cuid(),
  note: z.string().max(2000).optional(),
});

export async function submitAccessRoleApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ applicationId: string }>> {
  try {
    const user = await requireAuth();
    const raw = Object.fromEntries(formData);
    const parsed = applySchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const app = await accessRoleService.createApplication(
      user.id,
      parsed.data.accessRoleId,
      parsed.data.note,
    );
    revalidatePath("/learn/access-roles");
    return { success: true, data: { applicationId: app.id } };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function confirmAccessApplicationDocumentAction(
  applicationId: string,
  storageKey: string,
  fileName: string,
  mimeType: string,
  fileSizeBytes?: number,
): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    await uploadService.assertR2ObjectMatchesPolicy(storageKey, "accessApplication");
    await accessRoleService.attachDocument(applicationId, user.id, {
      storageKey,
      fileName,
      mimeType: mimeType || "application/octet-stream",
      fileSizeBytes: fileSizeBytes !== undefined ? BigInt(fileSizeBytes) : undefined,
    });
    revalidatePath("/learn/access-roles");
    revalidatePath("/admin/access-applications");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminApproveAccessApplicationAction(
  applicationId: string,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("users.manage");
    await accessRoleService.approveApplication(applicationId, user.id);
    revalidatePath("/admin/access-applications");
    revalidatePath("/learn/access-roles");
    revalidatePath("/courses");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminRejectAccessApplicationAction(
  applicationId: string,
  reviewNote: string,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("users.manage");
    await accessRoleService.rejectApplication(applicationId, user.id, reviewNote);
    revalidatePath("/admin/access-applications");
    revalidatePath("/learn/access-roles");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

const courseRolesSchema = z.object({
  courseId: z.string().cuid(),
  accessRoleIds: z.array(z.string().cuid()),
  accessRequirementMode: z.enum(["ALL", "ANY"]),
});

export async function adminSetCourseRequiredAccessRolesAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission("courses.moderate");
    const courseId = String(formData.get("courseId") ?? "");
    const ids = formData.getAll("accessRoleIds").map(String).filter(Boolean);
    const modeRaw = String(formData.get("accessRequirementMode") ?? "ALL");
    const accessRequirementMode =
      modeRaw === "ANY" ? CourseAccessRequirementMode.ANY : CourseAccessRequirementMode.ALL;
    const parsed = courseRolesSchema.safeParse({
      courseId,
      accessRoleIds: ids,
      accessRequirementMode: modeRaw === "ANY" ? "ANY" : "ALL",
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const course = await prisma.course.findFirst({
      where: { id: parsed.data.courseId, deletedAt: null },
      select: { slug: true },
    });
    if (!course) return { success: false, error: "Kurs bulunamadı." };

    await accessRoleService.setCourseAccessRequirements(
      parsed.data.courseId,
      parsed.data.accessRoleIds,
      accessRequirementMode,
    );
    revalidatePath(`/courses/${course.slug}`);
    revalidatePath("/courses");
    revalidatePath(`/admin/course-gates/${parsed.data.courseId}`);
    revalidatePath("/admin/courses");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

const manualGrantSchema = z.object({
  email: z.string().email(),
  accessRoleId: z.string().cuid(),
  grantNote: z
    .union([z.string(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : ""))
    .pipe(
      z
        .string()
        .min(5, "Rol atarken en az 5 karakterlik kısa bir açıklama girin.")
        .max(4000),
    ),
});

export async function adminGrantAccessRoleByEmailAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requirePermission("users.manage");
    const parsed = manualGrantSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const target = await prisma.user.findFirst({
      where: { email: parsed.data.email, deletedAt: null },
    });
    if (!target) return { success: false, error: "Kullanıcı bulunamadı." };

    await accessRoleService.grantRoleToUserManually({
      userId: target.id,
      accessRoleId: parsed.data.accessRoleId,
      granterId: user.id,
      manualGrantNote: parsed.data.grantNote,
    });
    revalidatePath("/admin/user-access");
    revalidatePath("/learn/access-roles");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

const revokeSchema = z.object({
  userId: z.string().cuid(),
  accessRoleId: z.string().cuid(),
});

export async function adminRevokeUserAccessRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("users.manage");
    const parsed = revokeSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await accessRoleService.revokeUserAccessRole(parsed.data.userId, parsed.data.accessRoleId, user.id);
    revalidatePath("/admin/user-access");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

const onlineSessionSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  platform: z.nativeEnum(LivePlatform),
  meetingUrl: z.string().url(),
  startsAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().positive(),
  participantNotes: z.string().optional(),
});

export async function adminCreateOnlineCourseSessionAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission("courses.moderate");
    const raw = Object.fromEntries(formData);
    const publishNow = raw.publishNow === "on" || raw.publishNow === "true";
    const parsed = onlineSessionSchema.safeParse({
      ...raw,
      durationMinutes: raw.durationMinutes,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await onlineCourseSessionService.create(parsed.data.courseId, {
      title: parsed.data.title,
      description: parsed.data.description,
      platform: parsed.data.platform,
      meetingUrl: parsed.data.meetingUrl,
      startsAt: new Date(parsed.data.startsAt),
      durationMinutes: parsed.data.durationMinutes,
      participantNotes: parsed.data.participantNotes,
      isPublished: publishNow,
    });
    revalidatePath(`/admin/course-gates/${parsed.data.courseId}`);
    revalidatePath("/learn");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminDeleteOnlineCourseSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("courses.moderate");
    const sessionId = String(formData.get("sessionId") ?? "");
    const courseId = String(formData.get("courseId") ?? "");
    if (!sessionId || !courseId) return { success: false, error: "Geçersiz istek." };
    await onlineCourseSessionService.delete(sessionId, courseId);
    revalidatePath(`/admin/course-gates/${courseId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

const sessionPublishSchema = z.object({
  sessionId: z.string().cuid(),
  courseId: z.string().cuid(),
  isPublished: z.enum(["true", "false"]),
});

export async function adminSetOnlineSessionPublishedAction(formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("courses.moderate");
    const parsed = sessionPublishSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await onlineCourseSessionService.setPublished(
      parsed.data.sessionId,
      parsed.data.courseId,
      parsed.data.isPublished === "true",
    );
    revalidatePath(`/admin/course-gates/${parsed.data.courseId}`);
    revalidatePath("/learn");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}
