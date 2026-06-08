"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { getRequestMetaFromHeaders } from "@/lib/auth/request-meta";
import { toActionError } from "@/lib/errors/service-error";
import { paymentService } from "@/services/payment.service";
import {
  uploadReceiptSchema,
  rejectPaymentSchema,
} from "@/validators/payment";
import type { ActionResult } from "@/types";

async function meta() {
  return getRequestMetaFromHeaders(await headers());
}

export async function initManualPaymentAction(orderId: string): Promise<ActionResult<{ paymentId: string }>> {
  try {
    const user = await requireAuth();
    const payment = await paymentService.createManualPayment(orderId, user.id);
    return { success: true, data: { paymentId: payment.id } };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function uploadReceiptAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const parsed = uploadReceiptSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await paymentService.setReceipt(parsed.data.paymentId, user.id, parsed.data.receiptStorageKey);
    revalidatePath("/checkout");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function approvePaymentAction(paymentId: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("payments.approve");
    await paymentService.approve(paymentId, user.id, await meta());
    revalidatePath("/admin/payments");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}

export async function rejectPaymentAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("payments.approve");
    const parsed = rejectPaymentSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
    }
    await paymentService.reject(parsed.data.paymentId, user.id, parsed.data.rejectionReason, await meta());
    revalidatePath("/admin/payments");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: toActionError(e) };
  }
}
