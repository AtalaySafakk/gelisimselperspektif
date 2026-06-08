import { confirmHeroSlideImageAction } from "@/actions/hero-slide.actions";
import { putFileToPresignedUrl } from "@/lib/storage/upload-browser";

export async function uploadHeroSlideImageFile(
  slideId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const presignRes = await fetch("/api/storage/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uploadType: "heroSlide",
      slideId,
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
    return { ok: false, error: presignJson.error ?? "Ön imza alınamadı." };
  }
  if (!presignJson.url || !presignJson.key) {
    return { ok: false, error: "Geçersiz sunucu yanıtı." };
  }

  await putFileToPresignedUrl(presignJson.url, file);
  const confirm = await confirmHeroSlideImageAction(slideId, presignJson.key);
  if (!confirm.success) {
    return { ok: false, error: confirm.error };
  }

  return { ok: true };
}

export function heroSlideImageSrc(slideId: string): string {
  return `/api/storage/hero-slide/${slideId}`;
}
