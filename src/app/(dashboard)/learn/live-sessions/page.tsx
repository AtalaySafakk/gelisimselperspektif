import Link from "next/link";
import { requireAuth } from "@/lib/auth/guards";
import { CourseAccessStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getLiveSessionStatus } from "@/services/live-session.service";
import { LiveSessionJoinCard } from "@/components/live/live-session-join-card";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LearnLiveSessionsPage() {
  const user = await requireAuth();

  // Fetch sessions for all courses the student has active access to
  const sessions = await prisma.liveSession.findMany({
    where: {
      lesson: {
        deletedAt: null,
        module: {
          deletedAt: null,
          course: {
            courseAccesses: {
              some: {
                userId: user.id,
                status: CourseAccessStatus.ACTIVE,
                order: { status: OrderStatus.PAID },
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      platform: true,
      meetingUrl: true,
      meetingPasswordEncrypted: true,
      startsAt: true,
      joinAvailableAt: true,
      durationMinutes: true,
      timezone: true,
      lessonId: true,
      lesson: {
        select: {
          module: {
            select: {
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Canlı Derslerim</h2>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Yaklaşan canlı ders yok.{" "}
            <Link href="/courses" className="text-primary hover:underline">
              Eğitimlere göz at
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const status = getLiveSessionStatus(s.joinAvailableAt, s.startsAt, s.durationMinutes);
            return (
              <LiveSessionJoinCard
                key={s.id}
                session={s}
                status={status}
                courseTitle={s.lesson.module.course.title}
                courseSlug={s.lesson.module.course.slug}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
