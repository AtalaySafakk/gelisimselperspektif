import { liveSessionService, getLiveSessionStatus } from "@/services/live-session.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveSessionStatusBadge } from "@/components/live/live-session-status-badge";

export const dynamic = "force-dynamic";

export default async function AdminLiveSessionsPage() {
  const sessions = await liveSessionService.listForAdmin();

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Canlı Oturumlar</h2>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Yaklaşan canlı oturum yok.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const status = getLiveSessionStatus(s.joinAvailableAt, s.startsAt, s.durationMinutes);
            const course = s.lesson.module.course;
            return (
              <Card key={s.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {course.title} · {s.platform}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {s.startsAt.toLocaleString("tr-TR")} · {s.durationMinutes} dk
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{s.meetingUrl}</p>
                  </div>
                  <LiveSessionStatusBadge status={status} />
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
