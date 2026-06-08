"use client";

import { useTransition, useState } from "react";
import { createOrderAction } from "@/actions/order.actions";
import { Button } from "@/components/ui/button";

type Props = {
  courseId: string;
  label: string;
  /** Uygunluk veya başka nedenle satın alma kapalı */
  disabled?: boolean;
};

export function BuyCourseButton({ courseId, label, disabled }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await createOrderAction(courseId);
      // createOrderAction redirects on success; res only exists on error
      if (res && !res.success) setError(res.error);
    });
  }

  return (
    <div>
      <Button size="lg" onClick={handleClick} disabled={pending || disabled}>
        {pending ? "Yönlendiriliyor…" : label}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
