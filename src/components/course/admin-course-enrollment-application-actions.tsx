"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adminApproveCourseEnrollmentApplicationAction,
  adminRejectCourseEnrollmentApplicationAction,
} from "@/actions/course-enrollment-application.actions";

type Props = {
  applicationId: string;
};

export function AdminCourseEnrollmentApplicationActions({ applicationId }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function approve() {
    startTransition(async () => {
      const res = await adminApproveCourseEnrollmentApplicationAction(applicationId);
      if (res.success) router.refresh();
    });
  }

  function reject() {
    const note = window.prompt("Red gerekçesi (öğrenciye görünür olabilir):") ?? "";
    if (!note.trim()) return;
    startTransition(async () => {
      const res = await adminRejectCourseEnrollmentApplicationAction(applicationId, note.trim());
      if (res.success) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" disabled={pending} onClick={approve}>
        Onayla
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={reject}>
        Reddet
      </Button>
    </div>
  );
}
