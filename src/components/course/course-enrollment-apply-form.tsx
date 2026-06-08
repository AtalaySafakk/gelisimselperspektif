"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { submitCourseEnrollmentApplicationAction } from "@/actions/course-enrollment-application.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  courseId: string;
};

export function CourseEnrollmentApplyForm({ courseId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("courseId", courseId);
    if (note.trim()) fd.set("note", note.trim());
    startTransition(async () => {
      const res = await submitCourseEnrollmentApplicationAction(fd);
      if (res.success) {
        setNote("");
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-lg border p-4">
      <h3 className="font-medium">Başvuru formu</h3>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="enrollment-note">Not (isteğe bağlı)</Label>
        <Input
          id="enrollment-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Kısa bir açıklama ekleyebilirsiniz"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Gönderiliyor…" : "Başvur"}
      </Button>
    </form>
  );
}
