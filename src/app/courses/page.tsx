import Link from "next/link";
import { courseService } from "@/services/course.service";
import { courseCategoryService } from "@/services/course-category.service";
import { CourseCard } from "@/components/course/course-card";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

export default async function CoursesPage({ searchParams }: Props) {
  const { q, category } = await searchParams;
  const [courses, categories] = await Promise.all([
    courseService.listPublished({ search: q, categorySlug: category }),
    courseCategoryService.listActive(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Eğitimler</h1>
        <p className="mt-2 text-muted-foreground">
          Psikoloji alanında uzman eğitmenlerden online eğitimler.
        </p>
      </div>

      <form className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Eğitim ara…"
          className="max-w-md"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Filtrele
        </button>
      </form>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">Henüz yayınlanmış eğitim yok.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/register" className="text-primary hover:underline">
          Eğitmen misiniz? Kayıt olun
        </Link>
      </p>
    </div>
  );
}
