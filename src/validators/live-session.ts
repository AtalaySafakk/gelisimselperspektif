import { z } from "zod";
import { LivePlatform } from "@prisma/client";

const isoDateTime = z
  .string()
  .datetime({ message: "Geçerli bir tarih-saat giriniz (ISO 8601)" });

export const liveSessionUpdateSchema = z
  .object({
    lessonId: z.string().cuid(),
    title: z.string().min(2, "Başlık en az 2 karakter").optional(),
    description: z.string().optional(),
    platform: z.nativeEnum(LivePlatform).optional(),
    meetingUrl: z.string().url("Geçerli bir URL giriniz").optional(),
    meetingPassword: z.string().optional(),
    startsAt: isoDateTime.optional(),
    joinAvailableAt: isoDateTime.optional(),
    durationMinutes: z.coerce.number().int().positive("Süre pozitif olmalı").optional(),
    timezone: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startsAt && data.joinAvailableAt) {
        return new Date(data.joinAvailableAt) <= new Date(data.startsAt);
      }
      return true;
    },
    {
      message: "Katılıma açılma zamanı başlangıç zamanından önce olmalı",
      path: ["joinAvailableAt"],
    },
  );

export type LiveSessionUpdateInput = z.infer<typeof liveSessionUpdateSchema>;
