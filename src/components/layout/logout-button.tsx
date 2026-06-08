"use client";

import { useTransition } from "react";
import { logoutAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
    >
      {pending ? "Çıkış…" : "Çıkış"}
    </Button>
  );
}
