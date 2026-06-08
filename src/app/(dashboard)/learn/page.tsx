import Link from "next/link";
import { requireAuth } from "@/lib/auth/guards";
import { learnService } from "@/services/learn.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LearnHomePage() {
  const user = await requireAuth();
  const accesses = await learnService.listEnrolledCourses(user.id);

  if (accesses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kurslarım</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Henüz bir kursa kayıt olmadınız.</p>
          <Link href="/courses" className="text-sm font-medium text-primary hover:underline">
            Eğitimlere göz at →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Kurslarım</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {accesses.map(({ course }) => (
          <Card key={course.id} className="flex flex-col transition-shadow hover:shadow-md">
            <CardHeader>
              <p className="text-xs text-primary">{course.category?.name}</p>
              <CardTitle className="text-lg">
                <Link
                  href={`/learn/courses/${course.slug}`}
                  className="hover:underline"
                >
                  {course.title}
                </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {course.instructor.profile?.displayName ??
                  course.instructor.profile?.firstName}
              </p>
            </CardHeader>
            <CardContent className="mt-auto text-sm text-muted-foreground">
              {course.modules.reduce((n, m) => n + m.lessons.length, 0)} ders
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
