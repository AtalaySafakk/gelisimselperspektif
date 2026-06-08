"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  adminApproveAccessApplicationAction,
  adminRejectAccessApplicationAction,
} from "@/actions/access-role.actions";

type Props = {
  applicationId: string;
};

export function AdminApplicationActions({ applicationId }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function approve() {
    startTransition(async () => {
      const res = await adminApproveAccessApplicationAction(applicationId);
      if (res.success) router.refresh();
    });
  }

  function reject() {
    const note = window.prompt("Red gerekçesi (öğrenciye görünür olabilir):") ?? "";
    if (!note.trim()) return;
    startTransition(async () => {
      const res = await adminRejectAccessApplicationAction(applicationId, note.trim());
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
