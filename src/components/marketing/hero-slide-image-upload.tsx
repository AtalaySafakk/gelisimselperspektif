"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { removeHeroSlideImageAction } from "@/actions/hero-slide.actions";
import { Button } from "@/components/ui/button";
import { HeroSlideImageFigure } from "@/components/marketing/hero-slide-image-figure";
import { heroSlideImageSrc, uploadHeroSlideImageFile } from "@/lib/hero-slide-upload";

type Phase = "idle" | "uploading" | "success" | "error";

export function HeroSlideImageUpload({
  slideId,
  title,
  hasImage,
  r2Enabled,
}: {
  slideId: string;
  title: string;
  hasImage: boolean;
  r2Enabled: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [localHasImage, setLocalHasImage] = useState(hasImage);

  useEffect(() => {
    setLocalHasImage(hasImage);
  }, [hasImage]);

  const localImageSrc = localHasImage ? heroSlideImageSrc(slideId) : null;

  const runUpload = useCallback(
    async (file: File) => {
      if (!r2Enabled) {
        setPhase("error");
        setMessage("Dosya yüklemek için R2 depolama yapılandırılmalı.");
        return;
      }
      setPhase("uploading");
      setMessage(null);

      const result = await uploadHeroSlideImageFile(slideId, file);
      if (!result.ok) {
        setPhase("error");
        setMessage(result.error);
        return;
      }

      setLocalHasImage(true);
      setPhase("success");
      setMessage("Görsel yüklendi.");
      router.refresh();
    },
    [slideId, router, r2Enabled],
  );

  async function handleRemoveUpload() {
    setPhase("uploading");
    setMessage(null);
    const result = await removeHeroSlideImageAction(slideId);
    if (!result.success) {
      setPhase("error");
      setMessage(result.error);
      return;
    }
    setLocalHasImage(false);
    setPhase("success");
    setMessage("Görsel kaldırıldı.");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border-2 border-dashed border-primary/30 bg-muted/30 p-5">
      <div>
        <h3 className="font-medium">Arka plan görseli</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Slayt arka planı için bilgisayarınızdan görsel yükleyin.
        </p>
      </div>

      <HeroSlideImageFigure
        title={title}
        imageSrc={localImageSrc}
        className="w-full rounded-lg border shadow-sm"
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={phase === "uploading" || !r2Enabled}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            void (file ? runUpload(file) : Promise.resolve());
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="default"
          size="sm"
          className="gap-2"
          disabled={phase === "uploading" || !r2Enabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {phase === "uploading" ? "Yükleniyor…" : localHasImage ? "Görseli değiştir" : "Görsel yükle"}
        </Button>
        {localHasImage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={phase === "uploading"}
            onClick={() => void handleRemoveUpload()}
          >
            Görseli kaldır
          </Button>
        )}
      </div>

      {!r2Enabled && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          R2 yapılandırılmadığı için dosya yükleme kapalı.
        </p>
      )}

      {message && (
        <p
          className={
            phase === "error"
              ? "text-sm text-destructive"
              : "text-sm text-green-600 dark:text-green-500"
          }
        >
          {message}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        En fazla 5 MB · JPEG, PNG veya WebP
      </p>
    </div>
  );
}
