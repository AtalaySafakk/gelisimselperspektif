import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { liveSessionService } from "@/services/live-session.service";
import { learnService } from "@/services/learn.service";
import { buildLiveSessionIcs } from "@/lib/utils/ics";

/**
 * GET /api/live-sessions/[id]/ics
 * Returns an iCalendar file for an enrolled student.
 * Requires active CourseAccess and paid order (kuralla aynı: getCourseForLearner).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getSession();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const session = await liveSessionService.getById(id);
  if (!session) {
    return new NextResponse("Not found", { status: 404 });
  }

  const courseId = session.lesson.module.course.id;
  const hasAccess = await learnService.hasAccess(user.id, courseId);
  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ics = buildLiveSessionIcs({
    id: session.id,
    title: session.title,
    description: session.description,
    meetingUrl: session.meetingUrl,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    timezone: session.timezone,
    courseTitle: session.lesson.module.course.title,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="live-${session.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
