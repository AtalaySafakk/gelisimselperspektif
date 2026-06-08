import Link from "next/link";
import { requireAuth } from "@/lib/auth/guards";
import { courseEnrollmentApplicationService } from "@/services/course-enrollment-application.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseEnrollmentApplicationDocUpload } from "@/components/course/course-enrollment-application-doc-upload";
import { CourseEnrollmentApplicationStatus, OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LearnCourseApplicationsPage() {
  const user = await requireAuth();
  const applications = await courseEnrollmentApplicationService.listForUser(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">Eğitim başvurularım</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Özel eğitimler için başvuru durumunuz ve onay sonrası ödeme linkiniz burada görünür.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href="/courses" className="text-primary underline">
            Eğitim kataloğuna dön
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        {applications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz eğitim başvurunuz yok.</p>
        ) : (
          applications.map((app) => {
            const order = app.order;
            const canPay =
              app.status === CourseEnrollmentApplicationStatus.APPROVED &&
              order &&
              order.paymentInviteToken &&
              (order.status === OrderStatus.PENDING ||
                order.status === OrderStatus.AWAITING_APPROVAL);

            return (
              <Card key={app.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{app.course.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Durum: {app.status} · {app.createdAt.toLocaleString("tr-TR")}
                    </p>
                    {app.reviewedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Karar:{" "}
                        {app.reviewedBy?.profile?.displayName ?? app.reviewedBy?.email ?? "—"} ·{" "}
                        {app.reviewedAt.toLocaleString("tr-TR")}
                      </p>
                    )}
                    {app.note && <p className="mt-2 text-sm">Başvuru notunuz: {app.note}</p>}
                    {app.status === CourseEnrollmentApplicationStatus.REJECTED && app.reviewNote && (
                      <p className="mt-2 text-sm text-destructive">Gerekçe: {app.reviewNote}</p>
                    )}
                  </div>
                  {canPay && (
                    <Button asChild>
                      <Link href={`/pay/invite/${order.paymentInviteToken}`}>Ödemeye git</Link>
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {app.status === CourseEnrollmentApplicationStatus.APPROVED &&
                    order?.status === OrderStatus.PAID && (
                      <Link
                        href={`/learn/courses/${app.course.slug}`}
                        className="font-medium text-primary underline"
                      >
                        Derse git →
                      </Link>
                    )}
                  {app.status === CourseEnrollmentApplicationStatus.APPROVED &&
                    order?.status === OrderStatus.AWAITING_APPROVAL && (
                      <p className="text-muted-foreground">
                        Dekontunuz inceleniyor. Onay sonrası eğitime erişebilirsiniz.
                      </p>
                    )}
                  {app.documents.length > 0 && (
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
                  )}
                  {app.status === CourseEnrollmentApplicationStatus.PENDING && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">
                        Kanıt belgesi yükleyin (PDF veya görsel)
                      </p>
                      <CourseEnrollmentApplicationDocUpload applicationId={app.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
