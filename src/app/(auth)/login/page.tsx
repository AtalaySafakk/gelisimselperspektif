import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/forms/login-form";

type PageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { callbackUrl } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Giriş Yap</CardTitle>
        <CardDescription>Hesabınıza erişmek için bilgilerinizi girin.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm callbackUrl={callbackUrl} />
      </CardContent>
    </Card>
  );
}
