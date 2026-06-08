import { Prisma, WalletTransaction } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Append-only wallet ledger.
 * Never call prisma.walletTransaction.update or .delete — use this repository only.
 */
export const walletTransactionRepository = {
  create(
    data: Prisma.WalletTransactionCreateInput,
  ): Promise<WalletTransaction> {
    return prisma.walletTransaction.create({ data });
  },

  createMany(
    data: Prisma.WalletTransactionCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return prisma.walletTransaction.createMany({ data });
  },

  findMany(args?: Prisma.WalletTransactionFindManyArgs) {
    return prisma.walletTransaction.findMany(args);
  },

  findFirst(args: Prisma.WalletTransactionFindFirstArgs) {
    return prisma.walletTransaction.findFirst(args);
  },
};

/** Guard: block accidental mutations at runtime in development */
export function assertWalletTransactionAppendOnly(): void {
  if (process.env.NODE_ENV === "production") return;

  const block = () => {
    throw new Error(
      "WalletTransaction is append-only. Use walletTransactionRepository.create().",
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = prisma.walletTransaction as any;
  if (!model.__appendOnlyPatched) {
    model.update = block;
    model.updateMany = block;
    model.delete = block;
    model.deleteMany = block;
    model.upsert = block;
    model.__appendOnlyPatched = true;
  }
}
