import type {
  CheckoutResult,
  CreateCheckoutInput,
  PaymentProvider,
} from "@/lib/providers/payment/types";

export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    void input;
    return {
      provider: this.name,
      requiresManualReceipt: true,
    };
  }
}

export const manualPaymentProvider = new ManualPaymentProvider();
