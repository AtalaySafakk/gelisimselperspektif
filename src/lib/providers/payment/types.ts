import type { Currency } from "@prisma/client";

export type CreateCheckoutInput = {
  orderId: string;
  amount: number;
  currency: Currency;
  studentId: string;
  courseId: string;
  returnUrl: string;
};

export type CheckoutResult = {
  provider: string;
  checkoutUrl?: string;
  requiresManualReceipt?: boolean;
  externalId?: string;
};

export type WebhookResult = {
  success: boolean;
  orderId?: string;
  externalPaymentId?: string;
  raw?: unknown;
};

export type RefundResult = {
  success: boolean;
  externalId?: string;
};

export interface PaymentProvider {
  readonly name: "manual" | "iyzico" | "paytr";
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  verifyWebhook?(
    payload: unknown,
    signature: string,
  ): Promise<WebhookResult>;
  refund?(paymentId: string, amount?: number): Promise<RefundResult>;
}
