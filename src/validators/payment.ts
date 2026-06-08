import { z } from "zod";

export const uploadReceiptSchema = z.object({
  paymentId: z.string().cuid(),
  receiptStorageKey: z.string().min(1, "Dekont dosyası gerekli"),
});

export const approvePaymentSchema = z.object({
  paymentId: z.string().cuid(),
});

export const rejectPaymentSchema = z.object({
  paymentId: z.string().cuid(),
  rejectionReason: z.string().min(5, "Red nedeni gerekli"),
});

export type UploadReceiptInput = z.infer<typeof uploadReceiptSchema>;
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
