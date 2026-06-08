import { notFound, redirect } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth/guards";
import { orderService } from "@/services/order.service";
import { CheckoutReceiptForm } from "@/components/payment/checkout-receipt-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const user = await requireAuth();
  const { orderId } = await params;

  const order = await orderService.getByIdForStudent(orderId, user.id);
  if (!order) notFound();

  if (order.status === OrderStatus.PAID) {
    redirect(`/learn/courses/${order.course.slug}`);
  }
  if (order.status === OrderStatus.CANCELLED) {
    redirect("/courses");
  }

  const price = new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number(order.total));

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-semibold">Ödeme</h1>
      <p className="mt-1 text-muted-foreground">Sipariş #{order.orderNumber.slice(-8)}</p>

      {/* Course summary */}
      <Card className="mt-6">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="font-medium">{order.course.title}</p>
            <p className="text-sm text-muted-foreground">
              {order.course.instructor.profile?.displayName}
            </p>
          </div>
          <span className="text-lg font-semibold">{price}</span>
        </CardContent>
      </Card>

      {/* Bank transfer details */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Havale / EFT Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Banka</span>
            <span>Ziraat Bankası</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hesap Adı</span>
            <span>Yılmazer Eğitim A.Ş.</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">IBAN</span>
            <span className="font-mono">TR00 0000 0000 0000 0000 0000 00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Açıklama</span>
            <span className="font-mono text-primary">{order.orderNumber.slice(-8)}</span>
          </div>
          <p className="mt-2 rounded-md bg-amber-50 p-2 text-amber-800 text-xs">
            Havale açıklamasına sipariş numarasını yazmayı unutmayın.
          </p>
        </CardContent>
      </Card>

      {/* Receipt upload */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Dekont Yükle</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckoutReceiptForm
            orderId={orderId}
            orderStatus={order.status}
            latestPaymentId={order.payments[0]?.id ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
