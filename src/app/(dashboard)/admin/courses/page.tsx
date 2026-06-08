import Link from "next/link";
import { CourseStatus } from "@prisma/client";
import { courseService } from "@/services/course.service";
import { courseCategoryService } from "@/services/course-category.service";
import { CourseStatusBadge } from "@/components/course/course-status-badge";
import { CourseWorkflowActions } from "@/components/course/course-workflow-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const [pending, all, categories] = await Promise.all([
    courseService.listForAdmin(CourseStatus.PENDING_REVIEW),
    courseService.listForAdmin(),
    courseCategoryService.listAll(),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl font-semibold">Kurs moderasyonu</h2>

      <section>
        <h3 className="mb-4 text-lg font-medium">
          İncelemede ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bekleyen kurs yok.</p>
        ) : (
          <div className="space-y-4">
            {pending.map((course) => (
              <Card key={course.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{course.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {course.instructor.profile?.displayName ??
                        course.instructor.email}{" "}
                      · {course.category?.name}
                    </p>
                  </div>
                  <CourseStatusBadge status={course.status} />
                </CardHeader>
                <CardContent>
                  <CourseWorkflowActions
                    courseId={course.id}
                    status={course.status}
                    mode="admin"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-medium">Tüm kurslar ({all.length})</h3>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left">Başlık</th>
                <th className="px-4 py-2 text-left">Eğitmen</th>
                <th className="px-4 py-2 text-left">Durum</th>
                <th className="px-4 py-2 text-left">Erişim</th>
              </tr>
            </thead>
            <tbody>
              {all.map((course) => (
                <tr key={course.id} className="border-b">
                  <td className="px-4 py-2">
                    {course.status === CourseStatus.PUBLISHED ? (
                      <Link
                        href={`/courses/${course.slug}`}
                        className="text-primary hover:underline"
                      >
                        {course.title}
                      </Link>
                    ) : (
                      course.title
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {course.instructor.profile?.displayName ?? course.instructor.email}
                  </td>
                  <td className="px-4 py-2">
                    <CourseStatusBadge status={course.status} />
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/course-gates/${course.id}`}
                      className="text-primary hover:underline"
                    >
                      Rol / çevrimiçi
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-medium">Kategoriler ({categories.length})</h3>
        <ul className="text-sm text-muted-foreground">
          {categories.map((c) => (
            <li key={c.id}>
              {c.name} ({c.slug}){!c.isActive && " — pasif"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
