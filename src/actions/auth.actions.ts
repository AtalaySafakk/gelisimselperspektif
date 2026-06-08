"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authService } from "@/services/auth.service";
import { setAuthCookies, clearAuthCookies, getRefreshTokenFromCookies } from "@/lib/auth/cookies";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";
import { getRequestMetaFromHeaders } from "@/lib/auth/request-meta";
import { toClientAuthMessage, AuthServiceError } from "@/lib/auth/errors";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/validators/auth";
import type { ActionResult } from "@/types";

async function meta() {
  return getRequestMetaFromHeaders(await headers());
}

export async function registerAction(
  formData: FormData,
): Promise<ActionResult<{ message: string }>> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
  }

  try {
    const result = await authService.register(parsed.data, await meta());
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: toClientAuthMessage(error) };
  }
}

export async function loginAction(
  formData: FormData,
): Promise<ActionResult<never>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
  }

  const callbackUrl = String(formData.get("callbackUrl") ?? "");

  try {
    const session = await authService.login(parsed.data, await meta());
    await setAuthCookies(session.accessToken, session.refreshToken);
    redirect(sanitizeCallbackUrl(callbackUrl, "/"));
  } catch (error) {
    if (
      error instanceof AuthServiceError &&
      error.kind === "EMAIL_NOT_VERIFIED"
    ) {
      redirect("/verify-email?pending=1");
    }
    return { success: false, error: toClientAuthMessage(error) };
  }
}

export async function verifyEmailAction(
  token: string,
): Promise<ActionResult<{ message: string }>> {
  if (!token) {
    return { success: false, error: "Doğrulama bağlantısı geçersiz." };
  }
  try {
    const result = await authService.verifyEmail(token, await meta());
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: toClientAuthMessage(error) };
  }
}

export async function forgotPasswordAction(
  formData: FormData,
): Promise<ActionResult<{ message: string }>> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
  }
  try {
    const result = await authService.forgotPassword(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: toClientAuthMessage(error) };
  }
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<ActionResult<{ message: string }>> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Geçersiz veri" };
  }
  try {
    const result = await authService.resetPassword(parsed.data, await meta());
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: toClientAuthMessage(error) };
  }
}

export async function logoutAction(): Promise<void> {
  const refresh = await getRefreshTokenFromCookies();
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  await authService.logout(refresh, session?.id, await meta());
  await clearAuthCookies();
  redirect("/");
}
