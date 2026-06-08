"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { HeroSlideTone } from "@prisma/client";
import { adminCreateHeroSlideAction } from "@/actions/hero-slide.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadHeroSlideImageFile } from "@/lib/hero-slide-upload";

const toneOptions: { value: HeroSlideTone; label: string }[] = [
  { value: HeroSlideTone.EMERALD, label: "Yeşil (varsayılan)" },
  { value: HeroSlideTone.SLATE, label: "Gri" },
  { value: HeroSlideTone.WARM, label: "Sıcak" },
];

type Props = { r2Enabled: boolean };

export function AdminHeroSlideCreateForm({ r2Enabled }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setPending(true);

      const form = e.currentTarget;
      const fd = new FormData(form);
      const file = fileRef.current?.files?.[0];

      if (file && !r2Enabled) {
        setPending(false);
        setError("Görsel yüklemek için R2 depolama yapılandırılmalı.");
        return;
      }

      const created = await adminCreateHeroSlideAction(fd);
      if (!created.success) {
        setPending(false);
        setError(created.error);
        return;
      }

      if (file) {
        const uploaded = await uploadHeroSlideImageFile(created.data.id, file);
        if (!uploaded.ok) {
          setPending(false);
          setError(`Slayt oluşturuldu ancak görsel yüklenemedi: ${uploaded.error}`);
          router.refresh();
          return;
        }
      }

      form.reset();
      setPickedFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      setPending(false);
      router.refresh();
    },
    [router, r2Enabled],
  );

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="new-eyebrow">Üst etiket</Label>
          <Input id="new-eyebrow" name="eyebrow" placeholder="Psikologlar için premium eğitim" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="new-title">Başlık *</Label>
          <Input id="new-title" name="title" required />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="new-description">Açıklama</Label>
          <textarea
            id="new-description"
            name="description"
            rows={2}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-3 sm:col-span-2 rounded-xl border-2 border-dashed border-primary/30 bg-muted/30 p-4">
          <Label htmlFor="new-image">Arka plan görseli</Label>
          <input
            ref={fileRef}
            id="new-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending || !r2Enabled}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={(e) => setPickedFileName(e.target.files?.[0]?.name ?? null)}
          />
          {pickedFileName && (
            <p className="text-xs text-muted-foreground">Seçilen: {pickedFileName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            En fazla 5 MB · JPEG, PNG veya WebP. İsteğe bağlı; sonra da ekleyebilirsiniz.
          </p>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <p className="text-xs text-muted-foreground">
            Butonlar isteğe bağlıdır. Metin ve link birlikte doldurulmalıdır.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-primaryLabel">Birincil buton</Label>
          <Input id="new-primaryLabel" name="primaryLabel" placeholder="Eğitimleri Keşfet" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-primaryHref">Birincil link</Label>
          <Input id="new-primaryHref" name="primaryHref" placeholder="/courses" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-secondaryLabel">İkincil buton</Label>
          <Input id="new-secondaryLabel" name="secondaryLabel" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-secondaryHref">İkincil link</Label>
          <Input id="new-secondaryHref" name="secondaryHref" placeholder="/login" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-tone">Renk tonu (görsel yoksa)</Label>
          <select
            id="new-tone"
            name="tone"
            defaultValue={HeroSlideTone.EMERALD}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {toneOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border" />
            Yayında
          </label>
        </div>
      </div>

      {!r2Enabled && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          R2 yapılandırılmadığı için görsel yüklenemez; yalnız metin slaytı oluşturulur.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Slayt ekle"}
      </Button>
    </form>
  );
}
