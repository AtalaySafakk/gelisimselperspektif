"use client";

import { useState, useTransition } from "react";
import { OrderStatus } from "@prisma/client";
import { initManualPaymentAction } from "@/actions/payment.actions";
import { confirmReceiptAndSubmitAction } from "@/actions/upload.actions";
import { R2UploadButton } from "@/components/upload/r2-upload-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  orderId: string;
  orderStatus: OrderStatus;
  /** Mevcut bekleyen ödeme kaydı (dekont önizleme linki için) */
  latestPaymentId?: string | null;
};

/**
 * R2 yapılandırılmışsa presigned PUT; aksi halde geliştirme modu placeholder.
 */
export function CheckoutReceiptForm({ orderId, orderStatus, latestPaymentId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(orderStatus === OrderStatus.AWAITING_APPROVAL);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const showSubmitted = submitted || orderStatus === OrderStatus.AWAITING_APPROVAL;
  const receiptViewPaymentId = paymentId ?? latestPaymentId ?? null;

  if (showSubmitted) {
    return (
      <div className="space-y-3 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        <p>Dekontunuz alındı. Admin onayından sonra kursa erişiminiz açılacak.</p>
        {receiptViewPaymentId && (
          <p>
            <a
              href={`/api/storage/receipt/${receiptViewPaymentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Yüklediğim dekontu görüntüle
            </a>
          </p>
        )}
      </div>
    );
  }

  async function ensurePayment(): Promise<string | null> {
    if (paymentId) return paymentId;
    const res = await initManualPaymentAction(orderId);
    if (!res.success) {
      setError(res.error);
      return null;
    }
    setPaymentId(res.data.paymentId);
    return res.data.paymentId;
  }

  async function onUploadSuccess(storageKey: string, _file?: File) {
    const pid = await ensurePayment();
    if (!pid) return;
    startTransition(async () => {
      const res = await confirmReceiptAndSubmitAction(pid, storageKey);
      if (res.success) {
        setPaymentId(pid);
        setSubmitted(true);
      } else setError(res.error);
    });
  }

  async function handleFallback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const file = (e.currentTarget.querySelector("#receipt-fallback") as HTMLInputElement)?.files?.[0];
    if (!file) {
      setError("Dosya seçin.");
      return;
    }
    const pid = await ensurePayment();
    if (!pid) return;
    const placeholderKey = `receipts/${orderId}/${Date.now()}-${file.name}`;
    startTransition(async () => {
      const res = await confirmReceiptAndSubmitAction(pid, placeholderKey);
      if (res.success) {
        setPaymentId(pid);
        setSubmitted(true);
      } else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <R2UploadButton
        uploadType="receipt"
        contextId={orderId}
        accept="image/*,.pdf"
        label="Dekont yükle (güvenli yükleme)"
        onSuccess={onUploadSuccess}
        disabled={pending}
      />

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">
          R2 yapılandırılmamışsa (yerel geliştirme)
        </summary>
        <form onSubmit={handleFallback} className="mt-3 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="receipt-fallback">Dekont (yalnızca anahtar simülasyonu)</Label>
            <input
              id="receipt-fallback"
              type="file"
              accept="image/*,.pdf"
              required
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Gönderiliyor…" : "Placeholder gönder"}
          </Button>
        </form>
      </details>
    </div>
  );
}
