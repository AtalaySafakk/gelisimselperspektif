import { CourseStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const labels: Record<CourseStatus, string> = {
  DRAFT: "Taslak",
  PENDING_REVIEW: "İncelemede",
  PUBLISHED: "Yayında",
  REJECTED: "Reddedildi",
  ARCHIVED: "Arşiv",
};

const styles: Record<CourseStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_REVIEW: "bg-amber-100 text-amber-900",
  PUBLISHED: "bg-primary/15 text-primary",
  REJECTED: "bg-destructive/10 text-destructive",
  ARCHIVED: "bg-secondary text-secondary-foreground",
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}
