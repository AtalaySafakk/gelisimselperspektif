"use client";

import { useState, useTransition } from "react";
import { PaymentStatus } from "@prisma/client";
import { approvePaymentAction, rejectPaymentAction } from "@/actions/payment.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  paymentId: string;
  status: PaymentStatus;
};

export function AdminPaymentActions({ paymentId, status }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done || status === PaymentStatus.APPROVED || status === PaymentStatus.REJECTED) {
    return (
      <p className="text-sm text-muted-foreground">
        {status === PaymentStatus.APPROVED ? "✓ Onaylandı" : "✗ Reddedildi"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await approvePaymentAction(paymentId);
              if (res.success) setDone(true);
              else setError(res.error);
            });
          }}
        >
          Onayla
        </Button>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData();
            fd.set("paymentId", paymentId);
            fd.set("rejectionReason", reason);
            startTransition(async () => {
              const res = await rejectPaymentAction(fd);
              if (res.success) setDone(true);
              else setError(res.error);
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`reason-${paymentId}`} className="text-xs">Red nedeni</Label>
            <Input
              id={`reason-${paymentId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Eksik bilgi…"
              className="h-8 w-48 text-xs"
              required
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Reddet
          </Button>
        </form>
      </div>
    </div>
  );
}
