import { HeroSlideTone, type HeroSlide } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ServiceError } from "@/lib/errors/service-error";

export type HeroSlideInput = {
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  primaryLabel?: string | null;
  primaryHref?: string | null;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  tone?: HeroSlideTone;
  isActive?: boolean;
};

function normalizeHref(href: string, field: string): string {
  const trimmed = href.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    throw new ServiceError(`${field} geçerli bir site içi yol olmalı (/ ile başlamalı).`, "BAD_REQUEST");
  }
  return trimmed;
}

function normalizeButtonPair(
  label: string | null | undefined,
  href: string | null | undefined,
  fieldName: string,
) {
  const labelTrim = label?.trim() || null;
  const hrefTrim = href?.trim() || null;
  if (Boolean(labelTrim) !== Boolean(hrefTrim)) {
    throw new ServiceError(
      `${fieldName} için hem metin hem link girilmeli veya ikisi de boş bırakılmalı.`,
      "BAD_REQUEST",
    );
  }
  return {
    label: labelTrim,
    href: hrefTrim ? normalizeHref(hrefTrim, fieldName) : null,
  };
}

function normalizeInput(input: HeroSlideInput) {
  const primary = normalizeButtonPair(input.primaryLabel, input.primaryHref, "Birincil buton");
  const secondary = normalizeButtonPair(
    input.secondaryLabel,
    input.secondaryHref,
    "İkincil buton",
  );

  return {
    eyebrow: input.eyebrow?.trim() || null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    primaryLabel: primary.label,
    primaryHref: primary.href,
    secondaryLabel: secondary.label,
    secondaryHref: secondary.href,
    tone: input.tone ?? HeroSlideTone.EMERALD,
    isActive: input.isActive ?? true,
  };
}

export type HeroSlidePublic = Pick<
  HeroSlide,
  | "id"
  | "eyebrow"
  | "title"
  | "description"
  | "primaryLabel"
  | "primaryHref"
  | "secondaryLabel"
  | "secondaryHref"
  | "tone"
> & {
  hasImage: boolean;
  imageSrc: string | null;
};

export const heroSlideService = {
  async listActive(): Promise<HeroSlidePublic[]> {
    const rows = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        eyebrow: true,
        title: true,
        description: true,
        primaryLabel: true,
        primaryHref: true,
        secondaryLabel: true,
        secondaryHref: true,
        tone: true,
        imageStorageKey: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      eyebrow: row.eyebrow,
      title: row.title,
      description: row.description,
      primaryLabel: row.primaryLabel,
      primaryHref: row.primaryHref,
      secondaryLabel: row.secondaryLabel,
      secondaryHref: row.secondaryHref,
      tone: row.tone,
      hasImage: Boolean(row.imageStorageKey),
      imageSrc: row.imageStorageKey ? `/api/storage/hero-slide/${row.id}` : null,
    }));
  },

  listAllForAdmin() {
    return prisma.heroSlide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  },

  async create(input: HeroSlideInput) {
    const data = normalizeInput(input);
    if (!data.title) throw new ServiceError("Başlık zorunludur.", "BAD_REQUEST");

    const maxOrder = await prisma.heroSlide.aggregate({ _max: { sortOrder: true } });
    return prisma.heroSlide.create({
      data: {
        ...data,
        imageStorageKey: null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  },

  async update(id: string, input: HeroSlideInput) {
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) throw new ServiceError("Slayt bulunamadı.", "NOT_FOUND");

    const data = normalizeInput(input);
    if (!data.title) throw new ServiceError("Başlık zorunludur.", "BAD_REQUEST");

    return prisma.heroSlide.update({ where: { id }, data });
  },

  async delete(id: string) {
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) throw new ServiceError("Slayt bulunamadı.", "NOT_FOUND");
    await prisma.heroSlide.delete({ where: { id } });
  },

  async setActive(id: string, isActive: boolean) {
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) throw new ServiceError("Slayt bulunamadı.", "NOT_FOUND");
    return prisma.heroSlide.update({ where: { id }, data: { isActive } });
  },

  async move(id: string, direction: "up" | "down") {
    const slides = await prisma.heroSlide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const index = slides.findIndex((s) => s.id === id);
    if (index === -1) throw new ServiceError("Slayt bulunamadı.", "NOT_FOUND");

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= slides.length) return;

    const current = slides[index]!;
    const other = slides[swapIndex]!;

    await prisma.$transaction([
      prisma.heroSlide.update({
        where: { id: current.id },
        data: { sortOrder: other.sortOrder },
      }),
      prisma.heroSlide.update({
        where: { id: other.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);
  },

  async clearUploadedImage(id: string) {
    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) throw new ServiceError("Slayt bulunamadı.", "NOT_FOUND");
    return prisma.heroSlide.update({
      where: { id },
      data: { imageStorageKey: null },
    });
  },
};
