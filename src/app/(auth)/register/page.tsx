import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kayıt Ol</CardTitle>
        <CardDescription>Öğrenci hesabı oluşturun ve e-postanızı doğrulayın.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
