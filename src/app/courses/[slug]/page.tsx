import { notFound } from "next/navigation";
import Link from "next/link";
import { Lock, PlayCircle, FileText, Video } from "lucide-react";
import {
  LessonType,
  CourseDeliveryMode,
  CourseAccessRequirementMode,
  CourseEnrollmentMode,
  CourseEnrollmentApplicationStatus,
  OrderStatus,
  CourseAccessStatus,
} from "@prisma/client";
import { courseService } from "@/services/course.service";
import { BuyCourseButton } from "@/components/payment/buy-course-button";
import { CourseThumbnailFigure } from "@/components/course/course-thumbnail-figure";
import { CourseEnrollmentApplyForm } from "@/components/course/course-enrollment-apply-form";
import { CourseEnrollmentApplicationDocUpload } from "@/components/course/course-enrollment-application-doc-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth/guards";
import { accessRoleService, explainCourseAccessRequirement } from "@/services/access-role.service";
import { courseEnrollmentApplicationService } from "@/services/course-enrollment-application.service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

const lessonTypeIcon: Record<LessonType, React.ReactNode> = {
  VIDEO: <Video className="h-3.5 w-3.5" />,
  LIVE: <PlayCircle className="h-3.5 w-3.5" />,
  DOCUMENT: <FileText className="h-3.5 w-3.5" />,
};

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await courseService.getPublishedBySlugPublic(slug);
  if (!course) notFound();

  const session = await getSession();
  const isApplicationCourse = course.enrollmentMode === CourseEnrollmentMode.APPLICATION;
  let canPurchase = !isApplicationCourse;
  let courseAccess = null;
  let enrollmentApp = null;

  if (session) {
    courseAccess = await prisma.courseAccess.findUnique({
      where: { userId_courseId: { userId: session.id, courseId: course.id } },
      include: { order: { select: { status: true } } },
    });
    if (isApplicationCourse) {
      enrollmentApp = await courseEnrollmentApplicationService.getForUserAndCourse(
        session.id,
        course.id,
      );
    }
  }

  const hasActiveAccess =
    courseAccess?.status === CourseAccessStatus.ACTIVE &&
    courseAccess.order.status === OrderStatus.PAID;

  if (!isApplicationCourse && course.requiredAccessRoles.length > 0) {
    const mode = course.accessRequirementMode;
    if (!session) {
      canPurchase = false;
    } else {
      const granted = await accessRoleService.getGrantedRoleIdSet(session.id);
      if (mode === CourseAccessRequirementMode.ALL) {
        const missing = course.requiredAccessRoles.filter((r) => !granted.has(r.accessRoleId));
        canPurchase = missing.length === 0;
      } else {
        canPurchase = course.requiredAccessRoles.some((r) => granted.has(r.accessRoleId));
      }
    }
  }

  const reqExplain =
    !isApplicationCourse && course.requiredAccessRoles.length > 0
      ? explainCourseAccessRequirement(course.requiredAccessRoles, course.accessRequirementMode)
      : null;

  const deliveryLabel =
    course.deliveryMode === CourseDeliveryMode.ONLINE ? "Çevrimiçi" : "Çevrimdışı";

  const price = Number(course.discountPrice ?? course.price);
  const instructorName =
    course.instructor.profile?.displayName ??
    `${course.instructor.profile?.firstName ?? ""} ${course.instructor.profile?.lastName ?? ""}`.trim();

  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const freePreviewCount = course.modules.reduce(
    (n, m) => n + m.lessons.filter((l) => l.isFreePreview).length,
    0,
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <p className="text-sm font-medium text-primary">{course.category?.name}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold leading-tight">
        {course.title}
      </h1>
      <p className="mt-2 text-muted-foreground">Eğitmen: {instructorName}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {deliveryLabel} eğitim
      </p>

      <CourseThumbnailFigure
        courseId={course.id}
        title={course.title}
        hasThumbnail={Boolean(course.thumbnailStorageKey)}
        className="mt-8 max-w-3xl rounded-xl border shadow-sm"
      />

      {/* Price + CTA */}
      <div className="mt-6 space-y-4">
        {!isApplicationCourse && course.requiredAccessRoles.length > 0 && reqExplain && (
          <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Gerekli uygunluk</p>
            <ul className="mt-2 list-inside list-disc text-muted-foreground">
              {course.requiredAccessRoles.map((r) => (
                <li key={r.accessRoleId}>{r.accessRole.name}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{reqExplain.ruleLine}</p>
          </div>
        )}

        {!isApplicationCourse && !canPurchase && reqExplain && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="whitespace-pre-line">{reqExplain.intro}</p>
            <p className="mt-3 text-amber-900/95">{reqExplain.ruleLine}</p>
            <p className="mt-3 font-medium">{reqExplain.closing}</p>
            <div className="mt-4">
              {session ? (
                <Link href="/learn/access-roles" className="font-medium text-primary underline">
                  Başvuru yapmak için tıklayın →
                </Link>
              ) : (
                <>
                  <Link href="/login" className="font-medium text-primary underline">
                    Giriş yapın
                  </Link>{" "}
                  veya{" "}
                  <Link href="/register" className="font-medium text-primary underline">
                    kayıt olun
                  </Link>
                  , ardından uygunluk başvurusu oluşturun.
                </>
              )}
            </div>
          </div>
        )}

        {isApplicationCourse && (
          <div className="space-y-4">
            {hasActiveAccess ? (
              <Button asChild>
                <Link href={`/learn/courses/${course.slug}`}>Derse git</Link>
              </Button>
            ) : !session ? (
              <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm">
                <p className="font-medium">Bu eğitim başvuru ile kayıt gerektirir.</p>
                <p className="mt-2 text-muted-foreground">
                  <Link href="/login" className="text-primary underline">
                    Giriş yapın
                  </Link>{" "}
                  veya{" "}
                  <Link href="/register" className="text-primary underline">
                    kayıt olun
                  </Link>{" "}
                  — başvuru için oturum gerekir.
                </p>
              </div>
            ) : enrollmentApp?.status === CourseEnrollmentApplicationStatus.PENDING ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-medium">Başvurunuz inceleniyor</p>
                <p className="mt-2 text-amber-900/90">
                  Onay sonrası ödeme linkiniz panelinizde görünecektir.
                </p>
                <div className="mt-3">
                  <CourseEnrollmentApplicationDocUpload applicationId={enrollmentApp.id} />
                </div>
              </div>
            ) : enrollmentApp?.status === CourseEnrollmentApplicationStatus.REJECTED ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
                  <p className="font-medium text-destructive">Başvurunuz reddedildi</p>
                  {enrollmentApp.reviewNote && (
                    <p className="mt-2">Gerekçe: {enrollmentApp.reviewNote}</p>
                  )}
                  <p className="mt-2 text-muted-foreground">Yeniden başvurabilirsiniz.</p>
                </div>
                <CourseEnrollmentApplyForm courseId={course.id} />
              </div>
            ) : enrollmentApp?.status === CourseEnrollmentApplicationStatus.APPROVED ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-950">
                <p className="font-medium">Başvurunuz onaylandı</p>
                {enrollmentApp.order?.status === OrderStatus.PAID ? (
                  <Button asChild className="mt-3">
                    <Link href={`/learn/courses/${course.slug}`}>Derse git</Link>
                  </Button>
                ) : enrollmentApp.order?.paymentInviteToken ? (
                  <p className="mt-2">
                    <Link
                      href="/learn/course-applications"
                      className="font-medium text-primary underline"
                    >
                      Ödemeniz hazır — panelden devam edin →
                    </Link>
                  </p>
                ) : (
                  <p className="mt-2 text-muted-foreground">Ödeme adımı hazırlanıyor.</p>
                )}
              </div>
            ) : (
              <CourseEnrollmentApplyForm courseId={course.id} />
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
        <div>
          {course.discountPrice && (
            <span className="mr-2 text-sm text-muted-foreground line-through">
              {new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency: "TRY",
                maximumFractionDigits: 0,
              }).format(Number(course.price))}
            </span>
          )}
          <span className="text-2xl font-semibold">
            {new Intl.NumberFormat("tr-TR", {
              style: "currency",
              currency: "TRY",
              maximumFractionDigits: 0,
            }).format(price)}
          </span>
        </div>
        {!isApplicationCourse && (
          <BuyCourseButton
            courseId={course.id}
            label="Satın al"
            disabled={!canPurchase}
          />
        )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>{course.modules.length} modül</span>
        <span>{totalLessons} ders</span>
        {freePreviewCount > 0 && (
          <span className="text-primary">{freePreviewCount} ücretsiz önizleme</span>
        )}
      </div>

      {course.shortDescription && (
        <p className="mt-6 text-lg text-muted-foreground">{course.shortDescription}</p>
      )}

      <div className="prose prose-neutral mt-8 max-w-none">
        <p className="whitespace-pre-wrap">{course.description}</p>
      </div>

      {/* Curriculum */}
      {course.modules.length > 0 && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Müfredat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {course.modules.map((mod) => (
              <div key={mod.id}>
                <h3 className="mb-2 font-medium">{mod.title}</h3>
                <ul className="space-y-1.5">
                  {mod.lessons.map((lesson) =>
                    lesson.isFreePreview ? (
                      /* ✅ Free preview — accessible, highlighted */
                      <li
                        key={lesson.id}
                        className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          {lessonTypeIcon[lesson.lessonType]}
                        </span>
                        <span className="flex-1">{lesson.title}</span>
                        {lesson.durationMinutes && (
                          <span className="text-xs text-muted-foreground">
                            {lesson.durationMinutes} dk
                          </span>
                        )}
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Ücretsiz
                        </span>
                      </li>
                    ) : (
                      /* 🔒 Paid — title visible for SEO/conversion, content locked */
                      <li
                        key={lesson.id}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                          "text-muted-foreground",
                        )}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground/50">
                          <Lock className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1">{lesson.title}</span>
                        {lesson.durationMinutes && (
                          <span className="text-xs text-muted-foreground/60">
                            {lesson.durationMinutes} dk
                          </span>
                        )}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bottom CTA */}
      <div className="mt-10 rounded-xl border bg-muted/40 p-6 text-center">
        <p className="mb-3 font-display text-lg font-medium">
          {isApplicationCourse ? "Bu eğitime başvurmak ister misiniz?" : "Bu eğitime erişmek ister misiniz?"}
        </p>
        {hasActiveAccess ? (
          <Button asChild>
            <Link href={`/learn/courses/${course.slug}`}>Derse git</Link>
          </Button>
        ) : isApplicationCourse ? (
          session ? (
            enrollmentApp?.status === CourseEnrollmentApplicationStatus.APPROVED &&
            enrollmentApp.order?.paymentInviteToken ? (
              <Button asChild>
                <Link href="/learn/course-applications">Ödemeye git</Link>
              </Button>
            ) : enrollmentApp?.status === CourseEnrollmentApplicationStatus.PENDING ? (
              <p className="text-sm text-muted-foreground">Başvurunuz inceleniyor.</p>
            ) : (
              <CourseEnrollmentApplyForm courseId={course.id} />
            )
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">Başvuru için giriş yapın</Link>
            </Button>
          )
        ) : (
          <BuyCourseButton
            courseId={course.id}
            label={`Satın al — ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price)}`}
            disabled={!canPurchase}
          />
        )}
      </div>
    </div>
  );
}
