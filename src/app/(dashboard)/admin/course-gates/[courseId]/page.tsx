import { notFound } from "next/navigation";
import { LivePlatform, CourseAccessRequirementMode, CourseEnrollmentMode } from "@prisma/client";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { accessRoleService } from "@/services/access-role.service";
import { onlineCourseSessionService } from "@/services/online-course-session.service";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminSetCourseRequiredAccessRolesAction,
  adminCreateOnlineCourseSessionAction,
  adminDeleteOnlineCourseSessionAction,
  adminSetOnlineSessionPublishedAction,
} from "@/actions/access-role.actions";
import { adminSetCourseEnrollmentModeAction } from "@/actions/course-enrollment-application.actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ courseId: string }> };

export default async function AdminCourseGatesPage({ params }: Props) {
  await requirePermission("courses.moderate");
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    include: { requiredAccessRoles: true },
  });
  if (!course) notFound();

  const [catalog, sessions] = await Promise.all([
    accessRoleService.listActiveCatalog(),
    onlineCourseSessionService.listForCourseAdmin(courseId),
  ]);

  const selected = new Set(course.requiredAccessRoles.map((r) => r.accessRoleId));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/courses" className="text-sm text-muted-foreground hover:underline">
          ← Kurslar
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold">{course.title}</h2>
        <p className="text-sm text-muted-foreground">Eğitim rol gereksinimleri ve çevrimiçi oturumlar</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kayıt türü</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={adminSetCourseEnrollmentModeAction as unknown as (fd: FormData) => Promise<void>}
            className="space-y-3"
          >
            <input type="hidden" name="courseId" value={courseId} />
            <p className="text-sm text-muted-foreground">
              Açık: katalogdan doğrudan satın alma. Başvuru gerekli: öğrenci başvurur, onay sonrası
              kişisel ödeme linki oluşturulur.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="enrollmentMode"
                value="OPEN"
                defaultChecked={course.enrollmentMode === CourseEnrollmentMode.OPEN}
              />
              Açık kayıt
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="enrollmentMode"
                value="APPLICATION"
                defaultChecked={course.enrollmentMode === CourseEnrollmentMode.APPLICATION}
              />
              Başvuru gerekli (özel eğitim)
            </label>
            <Button type="submit" size="sm">
              Kayıt türünü kaydet
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Satın alma için gerekli uygunluklar</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={adminSetCourseRequiredAccessRolesAction as unknown as (fd: FormData) => Promise<void>}
            className="space-y-4"
          >
            <input type="hidden" name="courseId" value={courseId} />
            <p className="text-sm text-muted-foreground">
              Hiçbiri seçilmezse kurs herkese açık (uygunluk kontrolü yok).
            </p>
            <fieldset className="space-y-2 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">Uygunluk koşulu</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="accessRequirementMode"
                  value="ALL"
                  defaultChecked={course.accessRequirementMode === CourseAccessRequirementMode.ALL}
                />
                Tümü gerekli (AND)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="accessRequirementMode"
                  value="ANY"
                  defaultChecked={course.accessRequirementMode === CourseAccessRequirementMode.ANY}
                />
                En az biri yeterli (OR — örn. USTA veya Teknik Personel)
              </label>
            </fieldset>
            <ul className="space-y-2">
              {catalog.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="accessRoleIds"
                    value={r.id}
                    id={`role-${r.id}`}
                    defaultChecked={selected.has(r.id)}
                  />
                  <label htmlFor={`role-${r.id}`} className="text-sm">
                    {r.name}
                  </label>
                </li>
              ))}
            </ul>
            <Button type="submit">Kaydet</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Çevrimiçi canlı oturum (kurs düzeyi)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            action={adminCreateOnlineCourseSessionAction as unknown as (fd: FormData) => Promise<void>}
            className="grid max-w-xl gap-3 md:grid-cols-2"
          >
            <input type="hidden" name="courseId" value={courseId} />
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="title">Başlık</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="description">Açıklama</Label>
              <Input id="description" name="description" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="platform">Platform</Label>
              <select
                id="platform"
                name="platform"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={LivePlatform.ZOOM}
              >
                {Object.values(LivePlatform).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="durationMinutes">Süre (dk)</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={90} required />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="meetingUrl">Katılım linki</Label>
              <Input id="meetingUrl" name="meetingUrl" type="url" required placeholder="https://..." />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="startsAt">Başlangıç (yerel saat)</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="participantNotes">Katılım notları</Label>
              <Input id="participantNotes" name="participantNotes" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="publishNow" name="publishNow" className="h-4 w-4" />
              <Label htmlFor="publishNow" className="font-normal">
                Oluşturulunca hemen yayınla (işaretli değilse taslak — öğrenci görmez)
              </Label>
            </div>
            <Button type="submit" className="md:col-span-2 w-fit">
              Oturum ekle
            </Button>
          </form>

          <div className="space-y-2 text-sm">
            <p className="font-medium">Tanımlı oturumlar</p>
            <p className="text-xs text-muted-foreground">
              Yalnızca «Yayında» işaretli oturumlar, ödeme tamamlanmış kayıtlı öğrencilere gösterilir.
            </p>
            {sessions.length === 0 ? (
              <p className="text-muted-foreground">Yok.</p>
            ) : (
              <ul className="space-y-3">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  >
                    <div>
                      <span className="font-medium">{s.title}</span>
                      <span className="ml-2 text-muted-foreground">
                        {s.startsAt.toLocaleString("tr-TR")}
                      </span>
                      <span
                        className={
                          s.isPublished
                            ? "ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
                            : "ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        }
                      >
                        {s.isPublished ? "Yayında" : "Taslak"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form
                        action={
                          adminSetOnlineSessionPublishedAction as unknown as (
                            fd: FormData,
                          ) => Promise<void>
                        }
                      >
                        <input type="hidden" name="sessionId" value={s.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="isPublished"
                          value={s.isPublished ? "false" : "true"}
                        />
                        <Button type="submit" variant="secondary" size="sm">
                          {s.isPublished ? "Taslağa al" : "Yayınla"}
                        </Button>
                      </form>
                      <form
                        action={
                          adminDeleteOnlineCourseSessionAction as unknown as (
                            fd: FormData,
                          ) => Promise<void>
                        }
                      >
                        <input type="hidden" name="sessionId" value={s.id} />
                        <input type="hidden" name="courseId" value={courseId} />
                        <Button type="submit" variant="outline" size="sm">
                          Sil
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
