import { courseCategoryService } from "@/services/course-category.service";
import { CourseForm } from "@/components/course/course-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  const categories = await courseCategoryService.listActive();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Yeni kurs</CardTitle>
      </CardHeader>
      <CardContent>
        <CourseForm categories={categories} />
      </CardContent>
    </Card>
  );
}
