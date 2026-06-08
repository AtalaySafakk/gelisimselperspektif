import type { CourseDifficulty, LessonType, CourseDeliveryMode } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

/** getByIdForOwner cevabının client’a giden kısmı (Decimal + modül listesi) */
export type InstructorCoursePayload = {
  id: string;
  title: string;
  description: string;
  shortDescription: string | null;
  categoryId: string | null;
  price: Decimal;
  discountPrice: Decimal | null;
  difficulty: CourseDifficulty;
  deliveryMode: CourseDeliveryMode;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  thumbnailStorageKey: string | null;
  modules: {
    id: string;
    title: string;
    order: number;
    lessons: {
      id: string;
      title: string;
      lessonType: LessonType;
      order: number;
      isFreePreview: boolean;
    }[];
  }[];
};

/** Client bileşene güvenle verilebilir kurs özeti (Decimal / BigInt yok) */
export type CourseFormInitial = {
  id: string;
  title: string;
  description: string;
  shortDescription: string | null;
  categoryId: string | null;
  price: number;
  discountPrice: number | null;
  difficulty: CourseDifficulty;
  deliveryMode: CourseDeliveryMode;
  tags: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  thumbnailStorageKey: string | null;
};

export function toCourseFormInitial(course: InstructorCoursePayload): CourseFormInitial {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    shortDescription: course.shortDescription,
    categoryId: course.categoryId,
    price: Number(course.price),
    discountPrice: course.discountPrice != null ? Number(course.discountPrice) : null,
    difficulty: course.difficulty,
    deliveryMode: course.deliveryMode,
    tags: course.tags,
    metaTitle: course.metaTitle,
    metaDescription: course.metaDescription,
    thumbnailStorageKey: course.thumbnailStorageKey,
  };
}

export type CurriculumModuleClient = {
  id: string;
  title: string;
  order: number;
  lessons: {
    id: string;
    title: string;
    lessonType: LessonType;
    order: number;
    isFreePreview: boolean;
  }[];
};

export function toCurriculumModulesClient(
  course: InstructorCoursePayload,
): CurriculumModuleClient[] {
  return course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    order: m.order,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      lessonType: l.lessonType,
      order: l.order,
      isFreePreview: l.isFreePreview,
    })),
  }));
}
