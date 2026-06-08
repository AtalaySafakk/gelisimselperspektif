"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { UploadType } from "@/services/upload.service";

type PresignRequestBody =
  | { uploadType: "receipt"; orderId: string; contentType: string; contentLength: number }
  | { uploadType: "thumbnail"; courseId: string; contentType: string; contentLength: number }
  | { uploadType: "document"; lessonId: string; contentType: string; contentLength: number }
  | { uploadType: "video"; lessonId: string; contentType: string; contentLength: number }
  | {
      uploadType: "accessApplication";
      applicationId: string;
      contentType: string;
      contentLength: number;
    }
  | {
      uploadType: "courseEnrollmentApplication";
      applicationId: string;
      contentType: string;
      contentLength: number;
    }
  | { uploadType: "heroSlide"; slideId: string; contentType: string; contentLength: number };

type Props = {
  uploadType: UploadType;
  /** Context ID: orderId | courseId | lessonId depending on uploadType */
  contextId: string;
  accept: string;
  label: string;
  onSuccess: (storageKey: string, file: File) => void | Promise<void>;
  disabled?: boolean;
};

/**
 * R2UploadButton
 *
 * Flow:
 *   1. User selects file
 *   2. POST /api/storage/presign-upload  → { url, key }
 *   3. PUT file directly to R2 (presigned URL)
 *   4. Call onSuccess(key) — parent confirms key in DB via Server Action
 */
export function R2UploadButton({
  uploadType,
  contextId,
  accept,
  label,
  onSuccess,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<"idle" | "presigning" | "uploading" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProgress("presigning");
    setErrorMsg(null);

    try {
      // Build presign request body
      const body: PresignRequestBody = buildBody(uploadType, contextId, file);

      const res = await fetch("/api/storage/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let fallback = "Yükleme bağlantısı alınamadı.";
        if (res.status === 503) {
          fallback = "Dosya sunucusu yapılandırılmamış. Lütfen yöneticiye bildirin.";
        } else if (res.status === 401) {
          fallback = "Oturumunuz sona ermiş olabilir. Sayfayı yenileyip tekrar giriş yapın.";
        } else if (res.status === 403) {
          fallback = "Bu sipariş için dekont yükleyemezsiniz.";
        } else if (res.status === 404) {
          fallback = "Sipariş bulunamadı.";
        }
        const err = await res.json().catch(() => ({ error: fallback }));
        throw new Error((err as { error: string }).error ?? fallback);
      }

      const { url, key } = (await res.json()) as { url: string; key: string };

      setProgress("uploading");

      const putRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });

      if (!putRes.ok) {
        throw new Error(
          "Dosya depoya yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.",
        );
      }

      setProgress("done");
      await onSuccess(key, file);
    } catch (err) {
      setProgress("error");
      setErrorMsg(err instanceof Error ? err.message : "Yükleme başarısız");
    }

    // Reset input so same file can be re-selected if needed
    if (inputRef.current) inputRef.current.value = "";
  }

  const isLoading = progress === "presigning" || progress === "uploading";

  const statusLabel =
    progress === "presigning"
      ? "Hazırlanıyor…"
      : progress === "uploading"
        ? "Yükleniyor…"
        : progress === "done"
          ? "Yüklendi ✓"
          : label;

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
          disabled={disabled || isLoading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          onClick={() => inputRef.current?.click()}
        >
          {statusLabel}
        </Button>
      </div>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
    </div>
  );
}

function buildBody(type: UploadType, contextId: string, file: File): PresignRequestBody {
  const base = { contentType: file.type, contentLength: file.size };
  switch (type) {
    case "receipt":
      return { uploadType: "receipt", orderId: contextId, ...base };
    case "thumbnail":
      return { uploadType: "thumbnail", courseId: contextId, ...base };
    case "document":
      return { uploadType: "document", lessonId: contextId, ...base };
    case "video":
      return { uploadType: "video", lessonId: contextId, ...base };
    case "accessApplication":
      return { uploadType: "accessApplication", applicationId: contextId, ...base };
    case "courseEnrollmentApplication":
      return {
        uploadType: "courseEnrollmentApplication",
        applicationId: contextId,
        ...base,
      };
    case "heroSlide":
      return { uploadType: "heroSlide", slideId: contextId, ...base };
  }
}
