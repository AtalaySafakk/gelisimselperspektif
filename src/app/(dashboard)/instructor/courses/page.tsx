import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { Role } from "@prisma/client";
import { courseService } from "@/services/course.service";
import { CourseStatusBadge } from "@/components/course/course-status-badge";
import { CourseThumbnailFigure } from "@/components/course/course-thumbnail-figure";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function InstructorCoursesPage() {
  const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
  const courses = await courseService.listForInstructor(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">Kurslarım</h2>
        <Button asChild>
          <Link href="/instructor/courses/new">Yeni kurs</Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Henüz kurs oluşturmadınız.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardHeader className="flex flex-row items-start gap-4 pb-2">
                <CourseThumbnailFigure
                  courseId={course.id}
                  title={course.title}
                  hasThumbnail={Boolean(course.thumbnailStorageKey)}
                  className="w-32 shrink-0 rounded-md border sm:w-40"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        <Link
                          href={`/instructor/courses/${course.id}`}
                          className="hover:underline"
                        >
                          {course.title}
                        </Link>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {course.category?.name ?? "Kategori yok"} · /{course.slug}
                      </p>
                    </div>
                    <CourseStatusBadge status={course.status} />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
