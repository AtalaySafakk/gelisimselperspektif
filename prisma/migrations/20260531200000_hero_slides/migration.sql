-- CreateEnum
CREATE TYPE "HeroSlideTone" AS ENUM ('EMERALD', 'SLATE', 'WARM');

-- CreateTable
CREATE TABLE "hero_slides" (
    "id" TEXT NOT NULL,
    "eyebrow" VARCHAR(200),
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "primaryLabel" VARCHAR(120) NOT NULL,
    "primaryHref" VARCHAR(500) NOT NULL,
    "secondaryLabel" VARCHAR(120),
    "secondaryHref" VARCHAR(500),
    "tone" "HeroSlideTone" NOT NULL DEFAULT 'EMERALD',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hero_slides_isActive_sortOrder_idx" ON "hero_slides"("isActive", "sortOrder");
