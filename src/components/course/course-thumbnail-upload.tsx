"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { confirmThumbnailUploadAction } from "@/actions/upload.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CourseThumbnailFigure } from "@/components/course/course-thumbnail-figure";
import { putFileToPresignedUrl } from "@/lib/storage/upload-browser";

type Phase = "idle" | "uploading" | "success" | "error";

export function CourseThumbnailUpload({
  courseId,
  title,
  hasThumbnail,
}: {
  courseId: string;
  title: string;
  hasThumbnail: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  /** Yükleme başarılı olunca önizleme göstermek için */
  const [localHasThumb, setLocalHasThumb] = useState(hasThumbnail);

  const runUpload = useCallback(
    async (file: File) => {
      setPhase("uploading");
      setMessage(null);
      try {
        const presignRes = await fetch("/api/storage/presign-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadType: "thumbnail",
            courseId,
            contentType: file.type,
            contentLength: file.size,
          }),
        });
        const presignJson = (await presignRes.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
          key?: string;
        };
        if (!presignRes.ok) {
          setPhase("error");
          setMessage(presignJson.error ?? "Ön imza alınamadı.");
          return;
        }
        if (!presignJson.url || !presignJson.key) {
          setPhase("error");
          setMessage("Geçersiz sunucu yanıtı.");
          return;
        }
        await putFileToPresignedUrl(presignJson.url, file);
        const confirm = await confirmThumbnailUploadAction(courseId, presignJson.key);
        if (!confirm.success) {
          setPhase("error");
          setMessage(confirm.error);
          return;
        }
        setLocalHasThumb(true);
        setPhase("success");
        setMessage("Kapak güncellendi.");
        router.refresh();
      } catch (e) {
        setPhase("error");
        setMessage(e instanceof Error ? e.message : "Yükleme başarısız.");
      }
    },
    [courseId, router],
  );

  return (
    <div className="space-y-3">
      <Label>Kurs görseli</Label>
      <CourseThumbnailFigure
        courseId={courseId}
        title={title}
        hasThumbnail={localHasThumb}
        className="max-w-md rounded-lg border"
      />
      <div className="flex max-w-md flex-col gap-2">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={phase === "uploading"}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
          onChange={(e) => {
            const file = e.target.files?.[0];
            void (file ? runUpload(file) : Promise.resolve());
            e.target.value = "";
          }}
        />
        {phase === "uploading" && (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        )}
        {message && (
          <p
            className={
              phase === "error" ? "text-sm text-destructive" : "text-sm text-green-600 dark:text-green-500"
            }
          >
            {message}
          </p>
        )}
        {phase === "success" && (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setPhase("idle")}>
            Tamam
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">En fazla 2 MB · JPEG, PNG veya WebP</p>
    </div>
  );
}
