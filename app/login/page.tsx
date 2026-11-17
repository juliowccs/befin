"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, GoogleLogo, SignIn } from "@phosphor-icons/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { BefinMark, BefinWordmark } from "@/components/brand/befin-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/src/lib/auth-client";
import { type LoginFormValues, loginSchema } from "@/src/lib/schemas/auth";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isLoading = isSubmitting || isGoogleLoading;

  const onEmailLogin = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const result = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
      });
      if (result.error) {
        setServerError(
          result.error.message || "E-mail ou senha inválidos. Tente novamente.",
        );
        return;
      }
      router.push("/inicio");
      router.refresh();
    } catch {
      setServerError("Não foi possível entrar agora. Tente novamente.");
    }
  };

  const handleGoogleLogin = async () => {
    setServerError(null);
    setIsGoogleLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/inicio",
      });
      if (result?.error) {
        setServerError(
          result.error.message ||
            "Login com Google indisponível no momento. Verifique as credenciais OAuth.",
        );
      }
    } catch {
      setServerError(
        "Não foi possível iniciar o login com Google. Verifique a configuração OAuth.",
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-primary"
        >
          <ArrowLeft size={14} weight="bold" />
          Voltar
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <BefinMark />
          <BefinWordmark />
        </Link>
      </div>

      <Card className="border-border-subtle">
        <CardHeader>
          <CardTitle className="text-2xl">Entrar no befin</CardTitle>
          <CardDescription>
            Acesse sua conta para sincronizar suas caixinhas entre dispositivos.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <GoogleLogo size={18} weight="bold" />
            Continuar com Google
          </Button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-border-subtle" />
            <span className="mx-3 text-xs text-text-secondary">ou</span>
            <div className="flex-grow border-t border-border-subtle" />
          </div>

          <form
            onSubmit={handleSubmit(onEmailLogin)}
            noValidate
            className="flex flex-col gap-3.5"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs font-medium text-coral-text">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs font-medium text-coral-text">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p
                role="alert"
                className="rounded-2xl bg-coral-bg/70 px-3.5 py-2.5 text-xs font-medium text-coral-text"
              >
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              <SignIn size={16} weight="bold" />
              {isLoading ? "Entrando..." : "Entrar com e-mail"}
            </Button>
          </form>

          <div className="flex flex-col gap-2 border-t border-border-subtle pt-4 text-center text-xs text-text-secondary">
            <p>
              Ainda não tem conta?{" "}
              <Link
                href="/cadastro"
                className="font-semibold text-primary underline"
              >
                Criar conta grátis
              </Link>
            </p>
            <p>
              Prefere testar sem cadastro?{" "}
              <Link href="/inicio" className="font-semibold text-primary">
                Usar como convidado
              </Link>
            </p>
            <p className="pt-1 text-[11px]">
              Ao entrar, você concorda com nossa{" "}
              <Link href="/privacidade" className="underline">
                Política de Privacidade
              </Link>{" "}
              e{" "}
              <Link href="/termos" className="underline">
                Termos de Uso
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
