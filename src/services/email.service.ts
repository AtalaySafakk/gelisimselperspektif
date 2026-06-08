import { getClientEnv, getServerEnv } from "@/lib/env";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export const emailService = {
  async send(input: SendEmailInput): Promise<void> {
    const { NODE_ENV } = getServerEnv();

    if (NODE_ENV === "development") {
      console.info("\n📧 [DEV EMAIL]", {
        to: input.to,
        subject: input.subject,
        preview: input.text ?? input.html.slice(0, 200),
      });
      return;
    }

    // Production: integrate Resend/SMTP (Adım 4+)
    console.warn("[email] Production provider not configured", input.subject);
  },

  async sendVerificationEmail(to: string, token: string) {
    const base = getClientEnv().NEXT_PUBLIC_APP_URL;
    const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: "E-posta adresinizi doğrulayın — Yılmazer Akademi",
      html: `<p>Hoş geldiniz. Doğrulamak için <a href="${url}">buraya tıklayın</a>.</p>`,
      text: `E-posta doğrulama: ${url}`,
    });
  },

  async sendPasswordResetEmail(to: string, token: string) {
    const base = getClientEnv().NEXT_PUBLIC_APP_URL;
    const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to,
      subject: "Şifre sıfırlama — Yılmazer Akademi",
      html: `<p>Şifrenizi sıfırlamak için <a href="${url}">buraya tıklayın</a>. Bağlantı 1 saat geçerlidir.</p>`,
      text: `Şifre sıfırlama: ${url}`,
    });
  },
};
