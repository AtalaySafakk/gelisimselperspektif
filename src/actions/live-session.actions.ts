"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { getRequestMetaFromHeaders } from "@/lib/auth/request-meta";
import { toActionError } from "@/lib/errors/service-error";
import { liveSessionService } from "@/services/live-session.service";
import { liveSessionUpdateSchema } from "@/validators/live-session";
import type { ActionResult } from "@/types";

async function meta() {
  return getRequestMetaFromHeaders(await headers());
}

export async function updateLiveSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    const raw = Object.fromEntries(formData);
    const parsed = liveSessionUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const { lessonId, ...input } = parsed.data;
    await liveSessionService.update(
      lessonId,
      user.id,
      user.role,
      {
        ...input,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        joinAvailableAt: input.joinAvailableAt ? new Date(input.joinAvailableAt) : undefined,
      },
      await meta(),
    );
    revalidatePath("/instructor/courses");
    revalidatePath("/admin/live-sessions");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function deleteLiveSessionAction(lessonId: string): Promise<ActionResult> {
  try {
    const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
    await liveSessionService.softDelete(lessonId, user.id, user.role, await meta());
    revalidatePath("/instructor/courses");
    revalidatePath("/admin/live-sessions");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}
