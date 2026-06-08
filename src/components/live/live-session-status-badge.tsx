import type { LiveSessionStatus } from "@/services/live-session.service";
import { cn } from "@/lib/utils";

const config: Record<LiveSessionStatus, { label: string; className: string }> = {
  upcoming: {
    label: "Henüz açılmadı",
    className: "bg-muted text-muted-foreground",
  },
  open: {
    label: "Canlı",
    className: "bg-green-100 text-green-900 animate-pulse",
  },
  ended: {
    label: "Oturum sona erdi",
    className: "bg-secondary text-secondary-foreground",
  },
};

export function LiveSessionStatusBadge({ status }: { status: LiveSessionStatus }) {
  const { label, className } = config[status];
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {label}
    </span>
  );
}
