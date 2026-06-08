import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().min(2, "Ad en az 2 karakter olmalı"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalı"),
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı")
    .regex(/[A-Z]/, "En az bir büyük harf")
    .regex(/[a-z]/, "En az bir küçük harf")
    .regex(/[0-9]/, "En az bir rakam"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı")
    .regex(/[A-Z]/, "En az bir büyük harf")
    .regex(/[a-z]/, "En az bir küçük harf")
    .regex(/[0-9]/, "En az bir rakam"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
