/**
 * Minimal iCalendar (.ics) generator for live session invites.
 * No external dependency — spec-compliant RFC 5545 output.
 */

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(".000", "");
}

function escapeIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export type IcsEvent = {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  url?: string;
  organizerEmail?: string;
  organizerName?: string;
};

export function buildIcsContent(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Yilmazer Egitim//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(event.endsAt)}`,
    `SUMMARY:${escapeIcs(event.summary)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }
  if (event.organizerEmail) {
    const cn = event.organizerName ? `;CN=${event.organizerName}` : "";
    lines.push(`ORGANIZER${cn}:MAILTO:${event.organizerEmail}`);
  }

  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");

  // Fold lines > 75 chars per RFC 5545
  return lines
    .map((line) => {
      if (line.length <= 75) return line;
      let folded = line.slice(0, 75);
      let rest = line.slice(75);
      while (rest.length > 0) {
        folded += "\r\n " + rest.slice(0, 74);
        rest = rest.slice(74);
      }
      return folded;
    })
    .join("\r\n");
}

export function buildLiveSessionIcs(session: {
  id: string;
  title: string;
  description?: string | null;
  meetingUrl: string;
  startsAt: Date;
  durationMinutes: number;
  timezone: string;
  courseTitle: string;
}): string {
  const endsAt = new Date(session.startsAt.getTime() + session.durationMinutes * 60_000);
  return buildIcsContent({
    uid: `live-${session.id}@yilmazer`,
    summary: session.title,
    description: session.description
      ? `${session.description}\n\nKatılım linki: ${session.meetingUrl}`
      : `Katılım linki: ${session.meetingUrl}`,
    location: session.meetingUrl,
    startsAt: session.startsAt,
    endsAt,
    url: session.meetingUrl,
  });
}
