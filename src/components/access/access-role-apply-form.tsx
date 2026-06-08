"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAccessRoleApplicationAction } from "@/actions/access-role.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RoleOpt = { id: string; name: string; slug: string };

export function AccessRoleApplyForm({ roles }: { roles: RoleOpt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accessRoleId, setAccessRoleId] = useState(roles[0]?.id ?? "");
  const [note, setNote] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("accessRoleId", accessRoleId);
    if (note.trim()) fd.set("note", note.trim());
    startTransition(async () => {
      const res = await submitAccessRoleApplicationAction(fd);
      if (res.success) {
        setNote("");
        router.refresh();
      } else setError(res.error);
    });
  }

  if (roles.length === 0) {
    return <p className="text-sm text-muted-foreground">Tanımlı uygunluk rolü yok.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-lg border p-4">
      <h3 className="font-medium">Yeni başvuru</h3>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="accessRoleId">İstenen uygunluk</Label>
        <select
          id="accessRoleId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={accessRoleId}
          onChange={(e) => setAccessRoleId(e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Not (isteğe bağlı)</Label>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending || !accessRoleId}>
        {pending ? "Gönderiliyor…" : "Başvuruyu gönder"}
      </Button>
    </form>
  );
}
