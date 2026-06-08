import { HeroSlideTone, Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { isR2Configured } from "@/lib/env";
import { heroSlideService } from "@/services/hero-slide.service";
import { AdminHeroSlideCreateForm } from "@/components/admin/admin-hero-slide-create-form";
import { HeroSlideImageUpload } from "@/components/marketing/hero-slide-image-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminDeleteHeroSlideAction,
  adminMoveHeroSlideAction,
  adminToggleHeroSlideAction,
  adminUpdateHeroSlideAction,
} from "@/actions/hero-slide.actions";

export const dynamic = "force-dynamic";

const toneOptions: { value: HeroSlideTone; label: string }[] = [
  { value: HeroSlideTone.EMERALD, label: "Yeşil (varsayılan)" },
  { value: HeroSlideTone.SLATE, label: "Gri" },
  { value: HeroSlideTone.WARM, label: "Sıcak" },
];

function SlideFields({
  slide,
  prefix,
}: {
  slide: {
    eyebrow: string | null;
    title: string;
    description: string | null;
    primaryLabel: string | null;
    primaryHref: string | null;
    secondaryLabel: string | null;
    secondaryHref: string | null;
    tone: HeroSlideTone;
    isActive: boolean;
  };
  prefix: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${prefix}-eyebrow`}>Üst etiket</Label>
        <Input
          id={`${prefix}-eyebrow`}
          name="eyebrow"
          defaultValue={slide.eyebrow ?? ""}
          placeholder="Psikologlar için premium eğitim"
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${prefix}-title`}>Başlık *</Label>
        <Input id={`${prefix}-title`} name="title" required defaultValue={slide.title} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${prefix}-description`}>Açıklama</Label>
        <textarea
          id={`${prefix}-description`}
          name="description"
          rows={2}
          defaultValue={slide.description ?? ""}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <p className="text-xs text-muted-foreground">
          Butonlar isteğe bağlıdır. Metin ve link birlikte doldurulmalıdır.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-primaryLabel`}>Birincil buton</Label>
        <Input
          id={`${prefix}-primaryLabel`}
          name="primaryLabel"
          defaultValue={slide.primaryLabel ?? ""}
          placeholder="Eğitimleri Keşfet"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-primaryHref`}>Birincil link</Label>
        <Input
          id={`${prefix}-primaryHref`}
          name="primaryHref"
          defaultValue={slide.primaryHref ?? ""}
          placeholder="/courses"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-secondaryLabel`}>İkincil buton</Label>
        <Input
          id={`${prefix}-secondaryLabel`}
          name="secondaryLabel"
          defaultValue={slide.secondaryLabel ?? ""}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-secondaryHref`}>İkincil link</Label>
        <Input
          id={`${prefix}-secondaryHref`}
          name="secondaryHref"
          defaultValue={slide.secondaryHref ?? ""}
          placeholder="/login"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-tone`}>Renk tonu (görsel yoksa)</Label>
        <select
          id={`${prefix}-tone`}
          name="tone"
          defaultValue={slide.tone}
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
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={slide.isActive}
            className="h-4 w-4 rounded border"
          />
          Yayında
        </label>
      </div>
    </div>
  );
}

export default async function AdminHeroSlidesPage() {
  await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
  const [slides, r2Enabled] = await Promise.all([
    heroSlideService.listAllForAdmin(),
    Promise.resolve(isR2Configured()),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">Anasayfa slider</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Slayt metinlerini düzenleyin; arka plan için dosya yükleyin. Görsel yoksa renk tonu
          kullanılır.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yeni slayt</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminHeroSlideCreateForm r2Enabled={r2Enabled} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {slides.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Henüz slayt yok. Anasayfada varsayılan statik hero gösterilir.
          </p>
        ) : (
          slides.map((slide, idx) => (
            <Card key={slide.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  #{idx + 1} · {slide.title}
                  {!slide.isActive && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(taslak)</span>
                  )}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <form action={adminMoveHeroSlideAction as unknown as (fd: FormData) => Promise<void>}>
                    <input type="hidden" name="id" value={slide.id} />
                    <input type="hidden" name="direction" value="up" />
                    <Button type="submit" variant="outline" size="sm" disabled={idx === 0}>
                      ↑
                    </Button>
                  </form>
                  <form action={adminMoveHeroSlideAction as unknown as (fd: FormData) => Promise<void>}>
                    <input type="hidden" name="id" value={slide.id} />
                    <input type="hidden" name="direction" value="down" />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={idx === slides.length - 1}
                    >
                      ↓
                    </Button>
                  </form>
                  <form action={adminToggleHeroSlideAction as unknown as (fd: FormData) => Promise<void>}>
                    <input type="hidden" name="id" value={slide.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={slide.isActive ? "false" : "true"}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      {slide.isActive ? "Yayından kaldır" : "Yayınla"}
                    </Button>
                  </form>
                  <form action={adminDeleteHeroSlideAction as unknown as (fd: FormData) => Promise<void>}>
                    <input type="hidden" name="id" value={slide.id} />
                    <Button type="submit" variant="outline" size="sm" className="text-destructive">
                      Sil
                    </Button>
                  </form>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <HeroSlideImageUpload
                  slideId={slide.id}
                  title={slide.title}
                  hasImage={Boolean(slide.imageStorageKey)}
                  r2Enabled={r2Enabled}
                />
                <form
                  action={adminUpdateHeroSlideAction as unknown as (fd: FormData) => Promise<void>}
                  className="space-y-4"
                >
                  <input type="hidden" name="id" value={slide.id} />
                  <SlideFields slide={slide} prefix={slide.id} />
                  <Button type="submit">Kaydet</Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
