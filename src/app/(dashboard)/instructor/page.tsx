import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InstructorDashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Eğitmen Paneli</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-muted-foreground">
          Kurslarınızı oluşturun, müfredat ekleyin ve incelemeye gönderin.
        </p>
        <Link
          href="/instructor/courses"
          className="text-sm font-medium text-primary hover:underline"
        >
          Kurslarıma git →
        </Link>
      </CardContent>
    </Card>
  );
}
