import { analyticsService } from "@/services/analytics.service";

export const dynamic = "force-dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminDashboardPage() {
  const stats = await analyticsService.getAdminDashboardStats();

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              Toplam gelir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatTry(stats.revenue.total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              Aktif öğrenci
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.studentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              En çok satan (top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.topCourses.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">PAID siparişlere göre</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top kurslar</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.topCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz satış yok.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.topCourses.map((course, index) => (
                <li
                  key={course.courseId}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span>
                    <span className="mr-2 font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    {course.title}
                  </span>
                  <span className="text-muted-foreground">
                    {course.salesCount} satış · {formatTry(course.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
