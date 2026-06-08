import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

export function HeroSlideImageFigure({
  title,
  imageSrc,
  className,
}: {
  title: string;
  imageSrc: string | null;
  className?: string;
}) {
  if (!imageSrc) {
    return (
      <div
        className={cn(
          "relative flex aspect-[21/9] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 via-muted to-muted-foreground/15 text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="absolute h-12 w-12 opacity-20" aria-hidden />
        <span className="relative z-[1] text-sm text-muted-foreground">Henüz görsel yok</span>
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-[21/9] w-full overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt={title} className="h-full w-full object-cover" />
    </div>
  );
}
