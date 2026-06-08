"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlideTone } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroSlidePublic } from "@/services/hero-slide.service";

const AUTOPLAY_MS = 7000;

const toneClass: Record<HeroSlideTone, string> = {
  EMERALD:
    "border-primary/25 bg-gradient-to-br from-primary/20 via-background to-emerald-100/50",
  SLATE:
    "border-slate-300/50 bg-gradient-to-br from-slate-200/70 via-background to-slate-50",
  WARM:
    "border-amber-200/60 bg-gradient-to-br from-amber-100/80 via-background to-orange-50/70",
};

type HeroSliderProps = {
  slides: HeroSlidePublic[];
};

function SlideContent({ slide }: { slide: HeroSlidePublic }) {
  const hasPrimary = Boolean(slide.primaryLabel && slide.primaryHref);
  const hasSecondary = Boolean(slide.secondaryLabel && slide.secondaryHref);
  const hasButtons = hasPrimary || hasSecondary;

  return (
    <>
      {slide.eyebrow && (
        <p
          className={cn(
            "mb-4 text-sm font-medium uppercase tracking-widest",
            slide.hasImage ? "text-white/80" : "text-primary",
          )}
        >
          {slide.eyebrow}
        </p>
      )}
      <h1
        className={cn(
          "max-w-3xl font-display text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl",
          slide.hasImage ? "text-white drop-shadow-sm" : "text-foreground",
        )}
      >
        {slide.title}
      </h1>
      {slide.description && (
        <p
          className={cn(
            "mt-6 max-w-2xl text-lg",
            slide.hasImage ? "text-white/90" : "text-muted-foreground",
          )}
        >
          {slide.description}
        </p>
      )}
      {hasButtons && (
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {hasPrimary && (
            <Button asChild size="lg" variant={slide.hasImage ? "secondary" : "default"}>
              <Link href={slide.primaryHref!}>{slide.primaryLabel}</Link>
            </Button>
          )}
          {hasSecondary && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className={
                slide.hasImage
                  ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
                  : undefined
              }
            >
              <Link href={slide.secondaryHref!}>{slide.secondaryLabel}</Link>
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex((next + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => goTo(index + 1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, index, goTo]);

  if (count === 0) return null;

  const slide = slides[index]!;

  return (
    <section
      className="relative mx-auto max-w-6xl px-4"
      aria-roledescription="carousel"
      aria-label="Öne çıkan duyurular"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border shadow-sm transition-colors duration-700",
          !slide.hasImage && toneClass[slide.tone],
        )}
      >
        {!slide.hasImage && (
          <>
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />
          </>
        )}

        <div className="relative flex min-h-[340px] flex-col items-center justify-center px-6 py-14 text-center md:min-h-[420px] md:px-16 md:py-20">
          {slides.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "absolute inset-0 transition-all duration-700",
                i === index
                  ? "pointer-events-auto translate-x-0 opacity-100"
                  : "pointer-events-none translate-x-4 opacity-0",
              )}
              aria-hidden={i !== index}
            >
              {s.hasImage && s.imageSrc && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.imageSrc}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/45 to-black/30" />
                </>
              )}
              <div className="relative z-[1] flex h-full flex-col items-center justify-center px-6 py-14 md:px-16 md:py-20">
                <SlideContent slide={s} />
              </div>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background md:left-5"
              onClick={() => goTo(index - 1)}
              aria-label="Önceki slayt"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground shadow-sm backdrop-blur hover:bg-background md:right-5"
              onClick={() => goTo(index + 1)}
              aria-label="Sonraki slayt"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Slayt ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === index
                      ? cn("w-8", slide.hasImage ? "bg-white" : "bg-primary")
                      : cn(
                          "w-2",
                          slide.hasImage
                            ? "bg-white/40 hover:bg-white/60"
                            : "bg-primary/30 hover:bg-primary/50",
                        ),
                  )}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
