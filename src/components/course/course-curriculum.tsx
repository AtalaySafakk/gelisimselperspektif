"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LessonType } from "@prisma/client";
import { FileText, PlayCircle, Video } from "lucide-react";
import {
  createModuleAction,
  createLessonAction,
} from "@/actions/course.actions";
import {
  confirmDocumentUploadAction,
  confirmVideoUploadAction,
} from "@/actions/upload.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { putFileToPresignedUrl } from "@/lib/storage/upload-browser";

type LessonRow = {
  id: string;
  title: string;
  lessonType: LessonType;
  order: number;
  isFreePreview: boolean;
};

type ModuleRow = {
  id: string;
  title: string;
  order: number;
  lessons: LessonRow[];
};

type Props = {
  courseId: string;
  modules: ModuleRow[];
};

type AddKind = "video" | "document" | "live";

const lessonTypeIcon: Record<LessonType, React.ReactNode> = {
  VIDEO: <Video className="h-4 w-4 shrink-0 text-primary" aria-hidden />,
  DOCUMENT: <FileText className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />,
  LIVE: <PlayCircle className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />,
};

async function presignPut(
  body: Record<string, unknown>,
  file: File,
): Promise<{ key: string }> {
  const res = await fetch("/api/storage/presign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      contentType: file.type,
      contentLength: file.size,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    url?: string;
    key?: string;
  };
  if (!res.ok) throw new Error(data.error ?? "Ön imza alınamadı.");
  if (!data.url || !data.key) throw new Error("Geçersiz sunucu yanıtı.");
  await putFileToPresignedUrl(data.url, file);
  return { key: data.key };
}

export function CourseCurriculum({ courseId, modules }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState<{ moduleId: string; kind: AddKind } | null>(
    null,
  );

  function submitModule(formData: FormData) {
    setError(null);
    formData.set("courseId", courseId);
    startTransition(async () => {
      const res = await createModuleAction(formData);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz modül yok.</p>
      ) : (
        <ul className="space-y-4">
          {modules.map((mod) => (
            <li key={mod.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">
                  {mod.order + 1}. {mod.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={adding?.moduleId === mod.id && adding.kind === "video" ? "default" : "secondary"}
                    onClick={() =>
                      setAdding(
                        adding?.moduleId === mod.id && adding.kind === "video"
                          ? null
                          : { moduleId: mod.id, kind: "video" },
                      )
                    }
                  >
                    Video dersi ekle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={adding?.moduleId === mod.id && adding.kind === "document" ? "default" : "secondary"}
                    onClick={() =>
                      setAdding(
                        adding?.moduleId === mod.id && adding.kind === "document"
                          ? null
                          : { moduleId: mod.id, kind: "document" },
                      )
                    }
                  >
                    PDF dersi ekle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={adding?.moduleId === mod.id && adding.kind === "live" ? "default" : "secondary"}
                    onClick={() =>
                      setAdding(
                        adding?.moduleId === mod.id && adding.kind === "live"
                          ? null
                          : { moduleId: mod.id, kind: "live" },
                      )
                    }
                  >
                    Canlı ders ekle
                  </Button>
                </div>
              </div>
              {mod.lessons.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm">
                  {mod.lessons.map((l) => (
                    <li key={l.id} className="flex items-start gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="mt-0.5">{lessonTypeIcon[l.lessonType]}</span>
                      <span className="flex-1">
                        <span className="font-medium text-foreground">
                          {l.order + 1}. {l.title}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {l.lessonType === LessonType.VIDEO && "Video"}
                          {l.lessonType === LessonType.DOCUMENT && "PDF"}
                          {l.lessonType === LessonType.LIVE && "Canlı"}
                          {l.isFreePreview && " · Önizleme"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {adding?.moduleId === mod.id && adding.kind === "video" && (
                <VideoLessonForm
                  moduleId={mod.id}
                  disabled={pending}
                  onCancel={() => setAdding(null)}
                  onDone={() => {
                    setAdding(null);
                    router.refresh();
                  }}
                  onError={setError}
                />
              )}
              {adding?.moduleId === mod.id && adding.kind === "document" && (
                <DocumentLessonForm
                  moduleId={mod.id}
                  disabled={pending}
                  onCancel={() => setAdding(null)}
                  onDone={() => {
                    setAdding(null);
                    router.refresh();
                  }}
                  onError={setError}
                />
              )}
              {adding?.moduleId === mod.id && adding.kind === "live" && (
                <LiveLessonForm
                  moduleId={mod.id}
                  disabled={pending}
                  onCancel={() => setAdding(null)}
                  onDone={() => {
                    setAdding(null);
                    router.refresh();
                  }}
                  onError={setError}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="space-y-3 rounded-lg border border-dashed p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submitModule(new FormData(e.currentTarget));
          e.currentTarget.reset();
        }}
      >
        <h3 className="font-medium">Yeni modül</h3>
        <div className="space-y-1">
          <Label htmlFor="module-title">Modül başlığı</Label>
          <Input id="module-title" name="title" required />
        </div>
        <Button type="submit" disabled={pending}>
          Modül ekle
        </Button>
      </form>
    </div>
  );
}

function VideoLessonForm({
  moduleId,
  disabled,
  onCancel,
  onDone,
  onError,
}: {
  moduleId: string;
  disabled: boolean;
  onCancel: () => void;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "creating" | "uploading" | "done" | "fail">(
    "idle",
  );
  const [hint, setHint] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-3 border-t pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        onError(null);
        const form = e.currentTarget;
        const fileInput = form.elements.namedItem("videoFile") as HTMLInputElement;
        const file = fileInput?.files?.[0];
        if (!file) {
          onError("Video dosyası seçin.");
          return;
        }
        setPhase("creating");
        setHint("Ders oluşturuluyor…");
        const fd = new FormData(form);
        fd.set("moduleId", moduleId);
        fd.set("lessonType", LessonType.VIDEO);
        if (!fd.get("isFreePreview")) fd.delete("isFreePreview");
        const created = await createLessonAction(fd);
        if (!created.success) {
          setPhase("fail");
          setHint(null);
          onError(created.error);
          return;
        }
        if (!created.data.lessonId) {
          setPhase("fail");
          setHint(null);
          onError("Ders oluşturulamadı.");
          return;
        }
        const lessonId = created.data.lessonId;
        try {
          setPhase("uploading");
          setHint("Video yükleniyor…");
          const { key } = await presignPut({ uploadType: "video", lessonId }, file);
          setHint("Onaylanıyor…");
          const ok = await confirmVideoUploadAction(lessonId, key, file.type, file.size);
          if (!ok.success) throw new Error(ok.error);
          setPhase("done");
          setHint("Video dersi kaydedildi.");
          form.reset();
          onDone();
        } catch (err) {
          setPhase("fail");
          setHint(null);
          onError(err instanceof Error ? err.message : "Yükleme başarısız.");
        }
      }}
    >
      <p className="text-sm font-medium text-muted-foreground">Yeni video dersi</p>
      <div className="space-y-1">
        <Label htmlFor={`v-title-${moduleId}`}>Başlık</Label>
        <Input id={`v-title-${moduleId}`} name="title" required disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`v-desc-${moduleId}`}>Açıklama</Label>
        <textarea
          id={`v-desc-${moduleId}`}
          name="description"
          className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={disabled}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`v-dur-${moduleId}`}>Süre (sn, isteğe bağlı)</Label>
          <Input id={`v-dur-${moduleId}`} name="durationSeconds" type="number" min={1} disabled={disabled} />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input id={`v-free-${moduleId}`} name="isFreePreview" type="checkbox" value="true" className="h-4 w-4" />
          <Label htmlFor={`v-free-${moduleId}`} className="font-normal">
            Ücretsiz önizleme
          </Label>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`v-file-${moduleId}`}>Video dosyası</Label>
        <Input
          id={`v-file-${moduleId}`}
          name="videoFile"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          required
          disabled={disabled}
        />
      </div>
      {hint && <p className={cn("text-sm", phase === "fail" ? "text-destructive" : "text-muted-foreground")}>{hint}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={disabled || phase === "creating" || phase === "uploading"}>
          Kaydet ve yükle
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={phase === "uploading"}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

function DocumentLessonForm({
  moduleId,
  disabled,
  onCancel,
  onDone,
  onError,
}: {
  moduleId: string;
  disabled: boolean;
  onCancel: () => void;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "creating" | "uploading" | "done" | "fail">(
    "idle",
  );
  const [hint, setHint] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-3 border-t pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        onError(null);
        const form = e.currentTarget;
        const fileInput = form.elements.namedItem("pdfFile") as HTMLInputElement;
        const file = fileInput?.files?.[0];
        if (!file) {
          onError("PDF seçin.");
          return;
        }
        setPhase("creating");
        setHint("Ders oluşturuluyor…");
        const fd = new FormData(form);
        fd.set("moduleId", moduleId);
        fd.set("lessonType", LessonType.DOCUMENT);
        if (!fd.get("isFreePreview")) fd.delete("isFreePreview");
        const created = await createLessonAction(fd);
        if (!created.success) {
          setPhase("fail");
          setHint(null);
          onError(created.error);
          return;
        }
        if (!created.data.lessonId) {
          setPhase("fail");
          setHint(null);
          onError("Ders oluşturulamadı.");
          return;
        }
        const lessonId = created.data.lessonId;
        try {
          setPhase("uploading");
          setHint("PDF yükleniyor…");
          const { key } = await presignPut(
            { uploadType: "document", lessonId },
            file,
          );
          setHint("Onaylanıyor…");
          const ok = await confirmDocumentUploadAction(
            lessonId,
            key,
            file.name,
            file.size,
          );
          if (!ok.success) throw new Error(ok.error);
          setPhase("done");
          setHint("PDF dersi kaydedildi.");
          form.reset();
          onDone();
        } catch (err) {
          setPhase("fail");
          setHint(null);
          onError(err instanceof Error ? err.message : "Yükleme başarısız.");
        }
      }}
    >
      <p className="text-sm font-medium text-muted-foreground">Yeni PDF dersi</p>
      <div className="space-y-1">
        <Label htmlFor={`d-title-${moduleId}`}>Başlık</Label>
        <Input id={`d-title-${moduleId}`} name="title" required disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`d-desc-${moduleId}`}>Açıklama</Label>
        <textarea
          id={`d-desc-${moduleId}`}
          name="description"
          className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={disabled}
        />
      </div>
      <div className="flex items-end gap-2 pb-2">
        <input id={`d-free-${moduleId}`} name="isFreePreview" type="checkbox" value="true" className="h-4 w-4" />
        <Label htmlFor={`d-free-${moduleId}`} className="font-normal">
          Ücretsiz önizleme
        </Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`d-file-${moduleId}`}>PDF</Label>
        <Input
          id={`d-file-${moduleId}`}
          name="pdfFile"
          type="file"
          accept="application/pdf"
          required
          disabled={disabled}
        />
      </div>
      {hint && <p className={cn("text-sm", phase === "fail" ? "text-destructive" : "text-muted-foreground")}>{hint}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={disabled || phase === "creating" || phase === "uploading"}>
          Kaydet ve yükle
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={phase === "uploading"}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

function LiveLessonForm({
  moduleId,
  disabled,
  onCancel,
  onDone,
  onError,
}: {
  moduleId: string;
  disabled: boolean;
  onCancel: () => void;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "saving" | "fail">("idle");
  const [hint, setHint] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-3 border-t pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        onError(null);
        const form = e.currentTarget;
        const startsRaw = (form.elements.namedItem("startsAt") as HTMLInputElement).value;
        const joinRaw = (form.elements.namedItem("joinAvailableAt") as HTMLInputElement).value;
        if (!startsRaw || !joinRaw) {
          onError("Tarih ve saat alanlarını doldurun.");
          return;
        }
        setPhase("saving");
        setHint("Kaydediliyor…");
        const fd = new FormData(form);
        fd.set("moduleId", moduleId);
        fd.set("lessonType", LessonType.LIVE);
        fd.set("startsAt", new Date(startsRaw).toISOString());
        fd.set("joinAvailableAt", new Date(joinRaw).toISOString());
        if (!fd.get("isFreePreview")) fd.delete("isFreePreview");
        const res = await createLessonAction(fd);
        if (!res.success) {
          setPhase("fail");
          setHint(null);
          onError(res.error);
          return;
        }
        setHint("Canlı ders eklendi.");
        form.reset();
        setPhase("idle");
        onDone();
      }}
    >
      <p className="text-sm font-medium text-muted-foreground">Yeni canlı ders</p>
      <div className="space-y-1">
        <Label htmlFor={`l-title-${moduleId}`}>Başlık</Label>
        <Input id={`l-title-${moduleId}`} name="title" required disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`l-desc-${moduleId}`}>Açıklama</Label>
        <textarea
          id={`l-desc-${moduleId}`}
          name="description"
          className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={disabled}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`l-plat-${moduleId}`}>Platform</Label>
          <select
            id={`l-plat-${moduleId}`}
            name="platform"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={disabled}
            defaultValue="ZOOM"
          >
            <option value="ZOOM">Zoom</option>
            <option value="TEAMS">Microsoft Teams</option>
            <option value="OTHER">Diğer</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`l-dur-${moduleId}`}>Süre (dk)</Label>
          <Input
            id={`l-dur-${moduleId}`}
            name="durationMinutes"
            type="number"
            min={1}
            required
            defaultValue={60}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`l-url-${moduleId}`}>Toplantı bağlantısı</Label>
        <Input id={`l-url-${moduleId}`} name="meetingUrl" type="url" required disabled={disabled} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`l-pw-${moduleId}`}>Toplantı şifresi (isteğe bağlı)</Label>
        <Input id={`l-pw-${moduleId}`} name="meetingPassword" type="text" autoComplete="off" disabled={disabled} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`l-start-${moduleId}`}>Ders saati</Label>
          <Input id={`l-start-${moduleId}`} name="startsAt" type="datetime-local" required disabled={disabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`l-join-${moduleId}`}>Katılımın açılacağı zaman</Label>
          <Input
            id={`l-join-${moduleId}`}
            name="joinAvailableAt"
            type="datetime-local"
            required
            disabled={disabled}
          />
        </div>
      </div>
      <div className="flex items-end gap-2 pb-2">
        <input id={`l-free-${moduleId}`} name="isFreePreview" type="checkbox" value="true" className="h-4 w-4" />
        <Label htmlFor={`l-free-${moduleId}`} className="font-normal">
          Ücretsiz önizleme
        </Label>
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={disabled || phase === "saving"}>
          Kaydet
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={phase === "saving"}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}
