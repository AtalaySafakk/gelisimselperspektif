"use client";

import { useState, useTransition } from "react";
import { CourseStatus } from "@prisma/client";
import {
  submitCourseForReviewAction,
  publishCourseAction,
  rejectCourseAction,
  deleteCourseAction,
} from "@/actions/course.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  courseId: string;
  status: CourseStatus;
  mode: "instructor" | "admin";
};

export function CourseWorkflowActions({ courseId, status, mode }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.success) setError(res.error ?? "İşlem başarısız");
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {mode === "instructor" && (status === "DRAFT" || status === "REJECTED") && (
        <Button
          type="button"
          disabled={pending}
          onClick={() => run(() => submitCourseForReviewAction(courseId))}
        >
          İncelemeye gönder
        </Button>
      )}

      {mode === "admin" && status === "PENDING_REVIEW" && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => publishCourseAction(courseId))}
          >
            Yayınla
          </Button>
          <form
            className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("courseId", courseId);
              fd.set("rejectionReason", reason);
              run(() => rejectCourseAction(fd));
            }}
          >
            <div className="flex-1 space-y-1">
              <Label htmlFor="rejectionReason">Red nedeni</Label>
              <Input
                id="rejectionReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Eksik içerik…"
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              Reddet
            </Button>
          </form>
        </div>
      )}

      {mode === "instructor" && status !== "PUBLISHED" && (
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (confirm("Kurs arşivlenecek. Emin misiniz?")) {
              startTransition(() => {
                void deleteCourseAction(courseId);
              });
            }
          }}
        >
          Kursu sil
        </Button>
      )}
    </div>
  );
}
