"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CourseDifficulty, CourseDeliveryMode } from "@prisma/client";
import { courseUpsertSchema, type CourseUpsertInput } from "@/validators/course";
import { createCourseAction, updateCourseAction } from "@/actions/course.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CourseCategory } from "@prisma/client";
import { CourseThumbnailUpload } from "@/components/course/course-thumbnail-upload";
import type { CourseFormInitial } from "@/lib/course/client-serialize";

type Props = {
  categories: CourseCategory[];
  course?: CourseFormInitial;
};

export function CourseForm({ categories, course }: Props) {
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(course);

  const form = useForm<CourseUpsertInput>({
    resolver: zodResolver(courseUpsertSchema),
    defaultValues: course
      ? {
          title: course.title,
          description: course.description,
          shortDescription: course.shortDescription ?? "",
          categoryId: course.categoryId ?? undefined,
          price: Number(course.price),
          discountPrice: course.discountPrice ? Number(course.discountPrice) : undefined,
          difficulty: course.difficulty,
          tags: course.tags.join(", "),
          metaTitle: course.metaTitle ?? "",
          metaDescription: course.metaDescription ?? "",
          deliveryMode: course.deliveryMode,
        }
      : {
          title: "",
          description: "",
          difficulty: CourseDifficulty.BEGINNER,
          deliveryMode: CourseDeliveryMode.OFFLINE,
          price: 0,
        },
  });

  async function onSubmit(data: CourseUpsertInput) {
    setError(null);
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.set(k, String(v));
    });
    if (isEdit && course) {
      const res = await updateCourseAction(course.id, fd);
      if (!res.success) setError(res.error);
    } else {
      const res = await createCourseAction(fd);
      if (res && !res.success) setError(res.error);
    }
  }

  const { register, handleSubmit, formState } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {course && (
        <CourseThumbnailUpload
          courseId={course.id}
          title={course.title}
          hasThumbnail={Boolean(course.thumbnailStorageKey)}
        />
      )}
      <div className="space-y-2">
        <Label htmlFor="title">Başlık</Label>
        <Input id="title" {...register("title")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="shortDescription">Kısa açıklama</Label>
        <Input id="shortDescription" {...register("shortDescription")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Açıklama</Label>
        <textarea
          id="description"
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...register("description")}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Fiyat (TRY)</Label>
          <Input id="price" type="number" step="0.01" {...register("price")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discountPrice">İndirimli fiyat</Label>
          <Input id="discountPrice" type="number" step="0.01" {...register("discountPrice")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoryId">Kategori</Label>
        <select
          id="categoryId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...register("categoryId")}
        >
          <option value="">Seçiniz</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="deliveryMode">Eğitim tipi</Label>
        <select
          id="deliveryMode"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...register("deliveryMode")}
        >
          <option value={CourseDeliveryMode.OFFLINE}>Çevrimdışı (video, PDF, içerik)</option>
          <option value={CourseDeliveryMode.ONLINE}>Çevrimiçi (canlı oturum odaklı)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Çevrimiçi eğitimlerde canlı bilgileri admin panelinden kurs bazında girilir; ödeme sonrası
          öğrenci görür.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="difficulty">Seviye</Label>
        <select
          id="difficulty"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          {...register("difficulty")}
        >
          {Object.values(CourseDifficulty).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Etiketler (virgülle)</Label>
        <Input id="tags" {...register("tags")} />
      </div>
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Kaydediliyor…" : isEdit ? "Güncelle" : "Oluştur"}
      </Button>
    </form>
  );
}
