import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseThumbnailFigure } from "@/components/course/course-thumbnail-figure";
import type { Course, CourseCategory, User, Profile, InstructorProfile } from "@prisma/client";

type CourseWithRelations = Course & {
  category: CourseCategory | null;
  instructor: User & {
    profile: Profile | null;
    instructorProfile: InstructorProfile | null;
  };
};

export function CourseCard({ course }: { course: CourseWithRelations }) {
  const price = Number(course.discountPrice ?? course.price);
  const instructorName =
    course.instructor.profile?.displayName ??
    `${course.instructor.profile?.firstName ?? ""} ${course.instructor.profile?.lastName ?? ""}`.trim();

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CourseThumbnailFigure
        courseId={course.id}
        title={course.title}
        hasThumbnail={Boolean(course.thumbnailStorageKey)}
        className="rounded-none border-b"
      />
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {course.category?.name ?? "Eğitim"}
        </p>
        <CardTitle className="font-display text-lg leading-snug">
          <Link href={`/courses/${course.slug}`} className="hover:underline">
            {course.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        {course.shortDescription && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {course.shortDescription}
          </p>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{instructorName}</span>
          <span className="font-semibold">
            {new Intl.NumberFormat("tr-TR", {
              style: "currency",
              currency: "TRY",
              maximumFractionDigits: 0,
            }).format(price)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
