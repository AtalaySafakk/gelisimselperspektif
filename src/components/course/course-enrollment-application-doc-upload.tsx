"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { R2UploadButton } from "@/components/upload/r2-upload-button";
import { confirmCourseEnrollmentApplicationDocumentAction } from "@/actions/course-enrollment-application.actions";

type Props = {
  applicationId: string;
};

export function CourseEnrollmentApplicationDocUpload({ applicationId }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <R2UploadButton
      uploadType="courseEnrollmentApplication"
      contextId={applicationId}
      accept=".pdf,image/jpeg,image/png,image/webp"
      label="Belge yükle (PDF veya görsel)"
      disabled={pending}
      onSuccess={(key, file) => {
        startTransition(async () => {
          const res = await confirmCourseEnrollmentApplicationDocumentAction(
            applicationId,
            key,
            file.name,
            file.type || "application/octet-stream",
            file.size,
          );
          if (res.success) router.refresh();
        });
      }}
    />
  );
}
