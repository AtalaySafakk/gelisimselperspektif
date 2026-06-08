"use client";

import { useState } from "react";
import { LessonType } from "@prisma/client";
import { Button } from "@/components/ui/button";

type Props = {
  lessonId: string;
  lessonType: LessonType;
  hasVideo: boolean;
  hasDocument: boolean;
};

/**
 * Öğrenci tarafı: presign JSON alır, yalnızca CourseAccess olan kullanıcı için URL döner.
 */
export function LessonSignedMediaActions({ lessonId, lessonType, hasVideo, hasDocument }: Props) {
  const [videoErr, setVideoErr] = useState<string | null>(null);
  const [docErr, setDocErr] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);

  async function openSigned(type: "video" | "document") {
    const setErr = type === "video" ? setVideoErr : setDocErr;
    const setLoading = type === "video" ? setLoadingVideo : setLoadingDoc;
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/storage/presign-download?type=${type}&lessonId=${encodeURIComponent(lessonId)}`,
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok) throw new Error(data.error ?? "İçerik şu anda açılamıyor.");
      if (!data.url) throw new Error("Geçersiz yanıt alındı.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  if (lessonType === LessonType.VIDEO && hasVideo) {
    return (
      <div className="mt-2 space-y-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loadingVideo}
          onClick={() => void openSigned("video")}
        >
          {loadingVideo ? "Hazırlanıyor…" : "Videoyu aç"}
        </Button>
        {videoErr && <p className="text-xs text-destructive">{videoErr}</p>}
      </div>
    );
  }

  if (lessonType === LessonType.DOCUMENT && hasDocument) {
    return (
      <div className="mt-2 space-y-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loadingDoc}
          onClick={() => void openSigned("document")}
        >
          {loadingDoc ? "Hazırlanıyor…" : "Dokümanı indir"}
        </Button>
        {docErr && <p className="text-xs text-destructive">{docErr}</p>}
      </div>
    );
  }

  if (lessonType === LessonType.VIDEO && !hasVideo) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">Video henüz yüklenmedi.</p>
    );
  }
  if (lessonType === LessonType.DOCUMENT && !hasDocument) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">Doküman henüz yüklenmedi.</p>
    );
  }

  return null;
}
