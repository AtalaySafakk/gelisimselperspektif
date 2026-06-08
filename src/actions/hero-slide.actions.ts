"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { HeroSlideTone, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { toActionError } from "@/lib/errors/service-error";
import { heroSlideService } from "@/services/hero-slide.service";
import { uploadService } from "@/services/upload.service";
import type { ActionResult } from "@/types";

async function requireHeroSlideAdmin() {
  return requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
}

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const slideFieldsSchema = z.object({
  eyebrow: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  title: z.string().min(1, "Başlık zorunludur.").max(300),
  description: z.preprocess(emptyToUndefined, z.string().max(5000).optional()),
  primaryLabel: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  primaryHref: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  secondaryLabel: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  secondaryHref: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  tone: z.nativeEnum(HeroSlideTone).optional(),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.undefined()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

const idSchema = z.object({ id: z.string().cuid() });

export async function adminCreateHeroSlideAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireHeroSlideAdmin();
    const parsed = slideFieldsSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    const slide = await heroSlideService.create(parsed.data);
    revalidatePath("/");
    revalidatePath("/admin/hero-slides");
    return { success: true, data: { id: slide.id } };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminUpdateHeroSlideAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireHeroSlideAdmin();
    const raw = Object.fromEntries(formData);
    const idParsed = idSchema.safeParse(raw);
    const fieldsParsed = slideFieldsSchema.safeParse(raw);
    if (!idParsed.success || !fieldsParsed.success) {
      return {
        success: false,
        error:
          idParsed.error?.errors[0]?.message ??
          fieldsParsed.error?.errors[0]?.message ??
          "Geçersiz veri",
      };
    }
    await heroSlideService.update(idParsed.data.id, fieldsParsed.data);
    revalidatePath("/");
    revalidatePath("/admin/hero-slides");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminDeleteHeroSlideAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireHeroSlideAdmin();
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await heroSlideService.delete(parsed.data.id);
    revalidatePath("/");
    revalidatePath("/admin/hero-slides");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminToggleHeroSlideAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireHeroSlideAdmin();
    const raw = Object.fromEntries(formData);
    const idParsed = idSchema.safeParse(raw);
    const active = raw.isActive === "true";
    if (!idParsed.success) {
      return { success: false, error: idParsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await heroSlideService.setActive(idParsed.data.id, active);
    revalidatePath("/");
    revalidatePath("/admin/hero-slides");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function adminMoveHeroSlideAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireHeroSlideAdmin();
    const raw = Object.fromEntries(formData);
    const idParsed = idSchema.safeParse(raw);
    const direction = raw.direction === "down" ? "down" : "up";
    if (!idParsed.success) {
      return { success: false, error: idParsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await heroSlideService.move(idParsed.data.id, direction);
    revalidatePath("/");
    revalidatePath("/admin/hero-slides");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function confirmHeroSlideImageAction(
  slideId: string,
  storageKey: string,
): Promise<ActionResult> {
  try {
    const user = await requireHeroSlideAdmin();
    await uploadService.assertR2ObjectMatchesPolicy(storageKey, "heroSlide");
    await uploadService.confirmHeroSlideImageUpload(slideId, user.role, storageKey);
    revalidatePath("/");
    revalidatePath("/admin/hero-slides");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function removeHeroSlideImageAction(slideId: string): Promise<ActionResult> {
  try {
    await requireHeroSlideAdmin();
    await heroSlideService.clearUploadedImage(slideId);
    revalidatePath("/");
    revalidatePath("/admin/hero-slides");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}
