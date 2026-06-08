import { notFound } from "next/navigation";
import Link from "next/link";
import { Video, FileText, PlayCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { LessonType, CourseDeliveryMode } from "@prisma/client";
import { requireAuth } from "@/lib/auth/guards";
import { learnService } from "@/services/learn.service";
import { liveSessionService, getLiveSessionStatus } from "@/services/live-session.service";
import { onlineCourseSessionService } from "@/services/online-course-session.service";
import { ServiceError } from "@/lib/errors/service-error";
import { LiveSessionStatusBadge } from "@/components/live/live-session-status-badge";
import { LessonSignedMediaActions } from "@/components/learn/lesson-signed-media-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

const lessonIcon: Record<LessonType, React.ReactNode> = {
  VIDEO: <Video className="h-4 w-4" />,
  LIVE: <PlayCircle className="h-4 w-4" />,
  DOCUMENT: <FileText className="h-4 w-4" />,
};

export default async function LearnCoursePage({ params }: Props) {
  const user = await requireAuth();
  const { slug } = await params;

  let course;
  try {
    course = await learnService.getCourseForLearner(slug, user.id);
  } catch (e) {
    if (e instanceof ServiceError && e.code === "FORBIDDEN") notFound();
    throw e;
  }

  // Canlı oturum URL’leri: yalnız PAID + aktif kayıt doğrulandıktan sonra
  const liveSessions = await liveSessionService.listForLearner(course.id, user.id);
  const liveMap = new Map(liveSessions.map((s) => [s.lessonId, s]));

  const onlineSessions =
    course.deliveryMode === CourseDeliveryMode.ONLINE
      ? await onlineCourseSessionService.listForPaidEnrolledLearner(course.id, user.id)
      : [];

  const instructorName =
    course.instructor.profile?.displayName ??
    `${course.instructor.profile?.firstName ?? ""} ${course.instructor.profile?.lastName ?? ""}`.trim();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/learn" className="text-sm text-muted-foreground hover:underline">
          ← Kurslarım
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold">{course.title}</h1>
        <p className="text-sm text-muted-foreground">Eğitmen: {instructorName}</p>
      </div>

      {onlineSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Çevrimiçi canlı oturumlar</CardTitle>
            <p className="text-xs font-normal text-muted-foreground">
              Bu bölüm yalnızca ödemesi tamamlanmış kaydınız için yayınlanmış (admin onaylı) oturumları
              gösterir. Taslak oturumlar veya ödeme bekleyen kayıtlar için link görünmez.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {onlineSessions.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.startsAt.toLocaleString("tr-TR", { timeZone: s.timezone })} · {s.platform} ·{" "}
                  {s.durationMinutes} dk
                </p>
                {s.description && (
                  <p className="mt-2 text-muted-foreground">{s.description}</p>
                )}
                <a
                  href={s.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex"
                >
                  <Button size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Katılım linki
                  </Button>
                </a>
                {s.participantNotes && (
                  <p className="mt-2 text-xs text-muted-foreground">{s.participantNotes}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Curriculum */}
        <div className="space-y-4 lg:col-span-2">
          {course.modules.map((mod) => (
            <Card key={mod.id}>
              <CardHeader>
                <CardTitle className="text-base">{mod.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {mod.lessons.map((lesson) => {
                    const live = lesson.lessonType === LessonType.LIVE
                      ? liveMap.get(lesson.id)
                      : undefined;
                    const liveStatus = live
                      ? getLiveSessionStatus(live.joinAvailableAt, live.startsAt, live.durationMinutes)
                      : undefined;

                    return (
                      <li key={lesson.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-primary">{lessonIcon[lesson.lessonType]}</span>
                          <span className="flex-1 font-medium">{lesson.title}</span>
                          {lesson.durationMinutes && (
                            <span className="text-xs text-muted-foreground">
                              {lesson.durationMinutes} dk
                            </span>
                          )}
                          {lesson.lessonType !== LessonType.LIVE &&
                            lesson.lessonType !== LessonType.VIDEO &&
                            lesson.lessonType !== LessonType.DOCUMENT && (
                              <CheckCircle2 className="h-4 w-4 text-muted-foreground/30" />
                            )}
                        </div>

                        <LessonSignedMediaActions
                          lessonId={lesson.id}
                          lessonType={lesson.lessonType}
                          hasVideo={Boolean(lesson.video?.storageKey)}
                          hasDocument={Boolean(lesson.document?.storageKey)}
                        />

                        {lesson.lessonType === LessonType.LIVE && !live && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Canlı oturum henüz tanımlanmadı.
                          </p>
                        )}

                        {/* Live session block */}
                        {live && liveStatus && (
                          <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground">
                                {live.startsAt.toLocaleString("tr-TR")} · {live.platform}
                              </p>
                              <LiveSessionStatusBadge status={liveStatus} />
                            </div>

                            {liveStatus === "upcoming" && (
                              <p className="text-xs text-muted-foreground">
                                Katılım {live.joinAvailableAt.toLocaleString("tr-TR")} itibarıyla açılacak
                              </p>
                            )}

                            {liveStatus === "open" && (
                              <div className="space-y-1">
                                <a href={live.meetingUrl} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" className="gap-1.5">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Derse Katıl
                                  </Button>
                                </a>
                                {live.meetingPasswordEncrypted && (
                                  <p className="text-xs">
                                    Şifre:{" "}
                                    <span className="font-mono font-medium">
                                      {live.meetingPasswordEncrypted}
                                    </span>
                                  </p>
                                )}
                              </div>
                            )}

                            {liveStatus === "ended" && (
                              <p className="text-xs text-muted-foreground">Oturum sona erdi.</p>
                            )}

                            <a
                              href={`/api/live-sessions/${live.id}/ics`}
                              className="block text-xs text-muted-foreground hover:text-primary hover:underline"
                            >
                              Takvime ekle (.ics)
                            </a>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{course.title}</p>
              <p className="mt-1">{instructorName}</p>
              <p className="mt-3">
                {course.modules.reduce((n, m) => n + m.lessons.length, 0)} ders ·{" "}
                {course.modules.length} modül
              </p>
              <Link
                href="/learn/live-sessions"
                className="mt-3 block text-xs text-primary hover:underline"
              >
                Tüm canlı derslerim →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
