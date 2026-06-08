import { requireRole } from "@/lib/auth/guards";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function InstructorWalletPage() {
  const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);

  const [wallet, txList] = await Promise.all([
    prisma.walletBalance.findUnique({ where: { userId: user.id } }),
    prisma.walletTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { order: { select: { orderNumber: true, course: { select: { title: true } } } } },
    }),
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-semibold">Cüzdan</h2>

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Kullanılabilir Bakiye</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {fmt(Number(wallet?.availableBalance ?? 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Toplam Kazanç</p>
            <p className="mt-1 text-2xl font-semibold">
              {fmt(Number(wallet?.totalEarned ?? 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Toplam Çekim</p>
            <p className="mt-1 text-2xl font-semibold">
              {fmt(Number(wallet?.totalWithdrawn ?? 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {txList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz işlem yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-muted-foreground">
                  <tr>
                    <th className="pb-2 pr-4">Tarih</th>
                    <th className="pb-2 pr-4">Kurs</th>
                    <th className="pb-2 pr-4">Tür</th>
                    <th className="pb-2 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {txList.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">
                        {tx.createdAt.toLocaleDateString("tr-TR")}
                      </td>
                      <td className="py-2 pr-4">
                        {tx.order?.course?.title ?? tx.note ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{tx.type}</td>
                      <td
                        className={`py-2 text-right font-medium ${
                          tx.type === "SALE_CREDIT" ? "text-green-700" : "text-destructive"
                        }`}
                      >
                        {tx.type === "SALE_CREDIT" ? "+" : "-"}
                        {fmt(Number(tx.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
