import { PaymentStatus } from "@prisma/client";
import { paymentService } from "@/services/payment.service";
import { AdminPaymentActions } from "@/components/payment/admin-payment-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const statusLabels: Record<PaymentStatus, string> = {
  PENDING: "Bekliyor",
  UNDER_REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  REFUNDED: "İade",
};

const statusStyles: Record<PaymentStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  UNDER_REVIEW: "bg-amber-100 text-amber-900",
  APPROVED: "bg-green-100 text-green-900",
  REJECTED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-secondary text-secondary-foreground",
};

export default async function AdminPaymentsPage() {
  const payments = await paymentService.listForAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">Ödeme onay kuyruğu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Havale dekontu yüklenmiş veya bekleyen ödemeler aşağıda listelenir. Dekontu açmak için
          öğrenci veya admin oturumu gerekir; bağlantı kısa süreli imzalıdır (storage anahtarı URL’de
          görünmez).
        </p>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Bekleyen ödeme yok. Yeni dekontlar öğrenci checkout üzerinden geldikçe burada
            görünecektir.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => {
            const student = payment.order.student;
            const studentName =
              student.profile
                ? `${student.profile.firstName} ${student.profile.lastName}`
                : student.email;

            return (
              <Card key={payment.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{payment.order.course.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Öğrenci: {studentName} · Sipariş #{payment.order.orderNumber.slice(-8)}
                    </p>
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                        maximumFractionDigits: 2,
                      }).format(Number(payment.amount))}
                    </p>
                    {payment.receiptUploadedAt && (
                      <p className="text-xs text-muted-foreground">
                        Dekont yükleme: {payment.receiptUploadedAt.toLocaleString("tr-TR")}
                        {payment.id && (
                          <a
                            href={`/api/storage/receipt/${payment.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-primary hover:underline"
                          >
                            Dekontu gör
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[payment.status]}`}
                  >
                    {statusLabels[payment.status]}
                  </span>
                </CardHeader>
                <CardContent>
                  <AdminPaymentActions paymentId={payment.id} status={payment.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
