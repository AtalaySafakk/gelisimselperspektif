"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { resetPasswordSchema, type ResetPasswordInput } from "@/validators/auth";
import { resetPasswordAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [success, setSuccess] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setServerError(null);
    const fd = new FormData();
    fd.set("token", data.token);
    fd.set("password", data.password);
    fd.set("confirmPassword", data.confirmPassword);
    const result = await resetPasswordAction(fd);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setSuccess(result.data.message);
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">{success}</p>
        <Button asChild className="w-full">
          <Link href="/login">Giriş yap</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("token")} />
      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="password">Yeni şifre</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Şifre tekrar</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Kaydediliyor…" : "Şifreyi güncelle"}
      </Button>
    </form>
  );
}
