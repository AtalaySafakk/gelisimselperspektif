export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: "E-posta veya şifre hatalı.",
  /** Kayıt enumeration önleme — mevcut e-postada da aynı mesaj döner */
  REGISTER_UNAVAILABLE: "Kayıt işlemi tamamlanamadı. Bilgilerinizi kontrol edin veya giriş yapmayı deneyin.",
  EMAIL_NOT_VERIFIED: "Lütfen önce e-posta adresinizi doğrulayın.",
  ACCOUNT_INACTIVE: "Hesabınız aktif değil. Destek ile iletişime geçin.",
  TOKEN_INVALID: "Bağlantı geçersiz veya süresi dolmuş.",
  TOKEN_USED: "Bu bağlantı daha önce kullanılmış.",
  GENERIC: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
  REGISTER_SUCCESS: "Kayıt başarılı. E-postanızdaki doğrulama bağlantısına tıklayın.",
  VERIFY_SUCCESS: "E-posta adresiniz doğrulandı. Giriş yapabilirsiniz.",
  RESET_EMAIL_SENT: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.",
  RESET_SUCCESS: "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.",
} as const;

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly kind?: "EMAIL_NOT_VERIFIED" | "TOKEN_INVALID" | "TOKEN_USED",
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export function toClientAuthMessage(error: unknown): string {
  if (error instanceof AuthServiceError) return error.message;
  return AUTH_MESSAGES.GENERIC;
}
