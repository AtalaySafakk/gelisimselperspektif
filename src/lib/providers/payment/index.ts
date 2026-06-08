import { getServerEnv } from "@/lib/env";
import { manualPaymentProvider } from "@/lib/providers/payment/manual.provider";
import type { PaymentProvider } from "@/lib/providers/payment/types";

export function getPaymentProvider(): PaymentProvider {
  const { PAYMENT_PROVIDER } = getServerEnv();
  switch (PAYMENT_PROVIDER) {
    case "manual":
      return manualPaymentProvider;
    case "iyzico":
    case "paytr":
      throw new Error(`Payment provider "${PAYMENT_PROVIDER}" not implemented yet`);
    default:
      return manualPaymentProvider;
  }
}

export type { PaymentProvider } from "@/lib/providers/payment/types";
