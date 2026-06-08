-- AlterTable
ALTER TABLE "hero_slides" ALTER COLUMN "primaryLabel" DROP NOT NULL;
ALTER TABLE "hero_slides" ALTER COLUMN "primaryHref" DROP NOT NULL;
ALTER TABLE "hero_slides" ADD COLUMN "imageStorageKey" VARCHAR(500);
