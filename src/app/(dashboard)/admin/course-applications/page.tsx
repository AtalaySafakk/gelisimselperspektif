import { CourseEnrollmentApplicationStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/guards";
import { courseEnrollmentApplicationService } from "@/services/course-enrollment-application.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminCourseEnrollmentApplicationActions } from "@/components/course/admin-course-enrollment-application-actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string; courseId?: string }> };

export default async function AdminCourseApplicationsPage({ searchParams }: Props) {
  await requirePermission("courses.moderate");
  const { status: statusRaw, courseId } = await searchParams;
  const status =
    statusRaw === "PENDING" || statusRaw === "APPROVED" || statusRaw === "REJECTED"
      ? (statusRaw as CourseEnrollmentApplicationStatus)
      : undefined;

  const applications = await courseEnrollmentApplicationService.listForAdmin(status, courseId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <h2 className="font-display text-2xl font-semibold">Eğitim başvuruları</h2>
        <div className="flex gap-2 text-sm">
          <a href="/admin/course-applications" className="text-primary underline">
            Tümü
          </a>
          <a href="/admin/course-applications?status=PENDING" className="text-primary underline">
            Bekleyen
          </a>
          <a href="/admin/course-applications?status=APPROVED" className="text-primary underline">
            Onaylı
          </a>
          <a href="/admin/course-applications?status=REJECTED" className="text-primary underline">
            Red
          </a>
        </div>
      </div>

      <div className="space-y-4">
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Kayıt yok.</p>
        ) : (
          applications.map((app) => (
            <Card key={app.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{app.course.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {app.user.profile?.displayName ?? app.user.email} · {app.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {app.createdAt.toLocaleString("tr-TR")}
                  </p>
                  {app.reviewedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Karar:{" "}
                      {app.reviewedBy?.profile?.displayName ?? app.reviewedBy?.email ?? "—"} ·{" "}
                      {app.reviewedAt.toLocaleString("tr-TR")}
                    </p>
                  )}
                  {app.note && <p className="mt-2 text-sm">Başvuru notu: {app.note}</p>}
                </div>
                {app.status === CourseEnrollmentApplicationStatus.PENDING && (
                  <AdminCourseEnrollmentApplicationActions applicationId={app.id} />
                )}
              </CardHeader>
              <CardContent className="text-sm">
                {app.documents.length > 0 ? (
                  <ul>
                    {app.documents.map((d) => (
                      <li key={d.id}>
                        <a
                          href={`/api/storage/course-enrollment-application-doc/${d.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          {d.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Henüz belge yüklenmemiş.</p>
                )}
                {app.reviewNote && app.status === CourseEnrollmentApplicationStatus.REJECTED && (
                  <p className="mt-2 text-destructive">Red notu: {app.reviewNote}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
