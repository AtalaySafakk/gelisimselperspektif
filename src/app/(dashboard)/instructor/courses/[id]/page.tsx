import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { Role } from "@prisma/client";
import { courseService } from "@/services/course.service";
import { courseCategoryService } from "@/services/course-category.service";
import { CourseForm } from "@/components/course/course-form";
import { CourseStatusBadge } from "@/components/course/course-status-badge";
import { CourseWorkflowActions } from "@/components/course/course-workflow-actions";
import { CourseCurriculum } from "@/components/course/course-curriculum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  toCourseFormInitial,
  toCurriculumModulesClient,
} from "@/lib/course/client-serialize";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InstructorCourseEditPage({ params }: Props) {
  const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
  const { id } = await params;

  const course = await courseService.getByIdForOwner(id, user.id, user.role);
  if (!course) notFound();

  const categories = await courseCategoryService.listActive();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/instructor/courses" className="text-sm text-muted-foreground hover:underline">
          ← Kurslarım
        </Link>
        <CourseStatusBadge status={course.status} />
        {course.rejectionReason && (
          <p className="text-sm text-destructive">Red: {course.rejectionReason}</p>
        )}
      </div>

      <CourseWorkflowActions
        courseId={course.id}
        status={course.status}
        mode="instructor"
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Kurs bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm categories={categories} course={toCourseFormInitial(course)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Müfredat</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseCurriculum courseId={course.id} modules={toCurriculumModulesClient(course)} />
        </CardContent>
      </Card>
    </div>
  );
}
