import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

export type CourseThumbnailFigureProps = {
  courseId: string;
  title: string;
  hasThumbnail: boolean;
  className?: string;
};

/** Kapak: R2 anahtarı varsa imzalı yönlendirme endpoint’i; yoksa sabit placeholder. */
export function CourseThumbnailFigure({
  courseId,
  title,
  hasThumbnail,
  className,
}: CourseThumbnailFigureProps) {
  if (!hasThumbnail) {
    return (
      <div
        className={cn(
          "relative flex aspect-video w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-muted-foreground/15 text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="absolute h-14 w-14 opacity-20" aria-hidden />
        <span className="relative z-[1] font-display text-2xl font-semibold tracking-tight text-primary/45">
          {title.trim().slice(0, 2).toUpperCase() || "?"}
        </span>
      </div>
    );
  }
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-muted", className)}>
      {/* R2 imzalı URL — next/image remote config gerekir; LCP için doğrudan img */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/storage/course-thumbnail/${courseId}`}
        alt={title}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
