import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CourseCard } from "@/components/course/course-card";
import { HeroSlider } from "@/components/marketing/hero-slider";
import { courseService } from "@/services/course.service";
import { heroSlideService } from "@/services/hero-slide.service";

export const dynamic = "force-dynamic";

function StaticHero() {
  return (
    <section className="mx-auto max-w-3xl px-4 text-center">
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
        Psikologlar için premium eğitim
      </p>
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
        Klinik becerilerinizi bir üst seviyeye taşıyın
      </h1>
      <p className="mt-6 text-lg text-muted-foreground">
        Canlı oturumlar, video dersler ve sertifikalı programlar — tek platformda.
      </p>
      <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/courses">Eğitimleri Keşfet</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Giriş Yap</Link>
        </Button>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [featuredCourses, heroSlides] = await Promise.all([
    courseService.listPublished({ take: 6 }),
    heroSlideService.listActive(),
  ]);

  return (
    <div className="py-10 md:py-16">
      {heroSlides.length > 0 ? <HeroSlider slides={heroSlides} /> : <StaticHero />}

      <div className="container mx-auto max-w-6xl px-4">
        <section className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Uzman eğitmenler",
              description: "Alanında deneyimli psikologlardan öğrenin.",
            },
            {
              title: "Canlı oturumlar",
              description: "Zoom ve Teams ile interaktif dersler.",
            },
            {
              title: "Sertifikalı programlar",
              description: "Tamamladığınız eğitimleri belgeleyin.",
            },
          ].map((item) => (
            <Card key={item.title} className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </section>

        <section className="mt-24">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                Eğitimler
              </h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Yayında olan programlardan bir seçki. Tüm listeyi keşfetmek için eğitimler
                sayfasına gidin.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/courses">Tümünü gör</Link>
            </Button>
          </div>

          {featuredCourses.length === 0 ? (
            <p className="text-muted-foreground">
              Henüz yayınlanmış eğitim yok. Yakında burada olacak.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
