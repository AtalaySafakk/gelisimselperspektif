import { z } from "zod";
import { CourseDifficulty, CourseDeliveryMode, LessonType, LivePlatform } from "@prisma/client";

export const courseUpsertSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter"),
  description: z.string().min(20, "Açıklama en az 20 karakter"),
  shortDescription: z.string().max(500).optional(),
  categoryId: z.string().cuid().optional().nullable(),
  price: z.coerce.number().min(0),
  discountPrice: z.coerce.number().min(0).optional().nullable(),
  difficulty: z.nativeEnum(CourseDifficulty),
  deliveryMode: z.nativeEnum(CourseDeliveryMode).optional(),
  tags: z.string().optional(),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(320).optional(),
});

export const courseRejectSchema = z.object({
  courseId: z.string().cuid(),
  rejectionReason: z.string().min(5, "Red nedeni gerekli"),
});

export const moduleSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().min(2),
  order: z.coerce.number().int().min(0).optional(),
});

export const lessonBaseSchema = z.object({
  moduleId: z.string().cuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  order: z.coerce.number().int().min(0).optional(),
  isFreePreview: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "on"),
  durationMinutes: z.coerce.number().int().positive().optional(),
});

export const lessonVideoSchema = lessonBaseSchema.extend({
  lessonType: z.literal(LessonType.VIDEO),
  storageKey: z.string().optional(),
  durationSeconds: z
    .string()
    .optional()
    .transform((s) => {
      if (!s?.trim()) return undefined;
      const n = Number(s);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
    }),
});

export const lessonLiveSchema = lessonBaseSchema
  .extend({
    lessonType: z.literal(LessonType.LIVE),
    platform: z.nativeEnum(LivePlatform),
    meetingUrl: z.string().url(),
    meetingPassword: z.string().optional(),
    startsAt: z.string().datetime(),
    joinAvailableAt: z.string().datetime(),
    durationMinutes: z.coerce.number().int().positive(),
    timezone: z.string().default("Europe/Istanbul"),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.joinAvailableAt).getTime() > new Date(data.startsAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Katılım başlangıcı, ders saatinden sonra olamaz.",
        path: ["joinAvailableAt"],
      });
    }
  });

export const lessonDocumentSchema = lessonBaseSchema.extend({
  lessonType: z.literal(LessonType.DOCUMENT),
  storageKey: z.string().optional(),
  fileName: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().default(0),
});

export type CourseUpsertInput = z.infer<typeof courseUpsertSchema>;
