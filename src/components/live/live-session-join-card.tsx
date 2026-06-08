"use client";

import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";
import type { LiveSessionStatus } from "@/services/live-session.service";
import { LiveSessionStatusBadge } from "@/components/live/live-session-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SessionData = {
  id: string;
  title: string;
  description?: string | null;
  platform: string;
  meetingUrl: string;
  meetingPasswordEncrypted?: string | null;
  startsAt: Date;
  joinAvailableAt: Date;
  durationMinutes: number;
  timezone: string;
};

type Props = {
  session: SessionData;
  status: LiveSessionStatus;
  courseTitle: string;
  courseSlug: string;
};

export function LiveSessionJoinCard({ session, status, courseTitle, courseSlug }: Props) {
  const startsAtStr = session.startsAt.toLocaleString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{session.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            <Link href={`/learn/courses/${courseSlug}`} className="hover:underline">
              {courseTitle}
            </Link>{" "}
            · {session.platform}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {startsAtStr} · {session.durationMinutes} dk
          </p>
        </div>
        <LiveSessionStatusBadge status={status} />
      </CardHeader>

      <CardContent className="space-y-3">
        {session.description && (
          <p className="text-sm text-muted-foreground">{session.description}</p>
        )}

        {status === "upcoming" && (
          <p className="text-sm text-muted-foreground">
            Katılım linki {session.joinAvailableAt.toLocaleString("tr-TR")} tarihinden itibaren
            aktif olacak.
          </p>
        )}

        {status === "open" && (
          <div className="space-y-2">
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Derse Katıl ({session.platform})
              </Button>
            </a>
            {session.meetingPasswordEncrypted && (
              <p className="text-sm">
                <span className="text-muted-foreground">Şifre: </span>
                <span className="font-mono font-medium">
                  {session.meetingPasswordEncrypted}
                </span>
              </p>
            )}
          </div>
        )}

        {status === "ended" && (
          <p className="text-sm text-muted-foreground">Bu oturum sona erdi.</p>
        )}

        {/* ICS download — always shown */}
        <a
          href={`/api/live-sessions/${session.id}/ics`}
          className="text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          Takvime ekle (.ics)
        </a>
      </CardContent>
    </Card>
  );
}
