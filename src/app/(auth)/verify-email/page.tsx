import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/actions/auth.actions";

type PageProps = {
  searchParams: Promise<{ token?: string; pending?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token, pending } = await searchParams;

  if (token) {
    const result = await verifyEmailAction(token);
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {result.success ? "E-posta doğrulandı" : "Doğrulama başarısız"}
          </CardTitle>
          <CardDescription>
            {result.success ? result.data.message : result.error}
          </CardDescription>
        </CardHeader>
        {result.success && (
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Giriş yap</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-posta doğrulama</CardTitle>
        <CardDescription>
          {pending
            ? "Giriş yapmadan önce kayıt sırasında gönderilen doğrulama bağlantısına tıklayın."
            : "Kayıt sonrası e-postanıza gelen bağlantıyı kullanın."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Giriş sayfası</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
