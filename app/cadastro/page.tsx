"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  GoogleLogo,
  LockSimple,
  UserPlus,
} from "@phosphor-icons/react";
import { BefinMark, BefinWordmark } from "@/components/brand/befin-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/src/lib/auth-client";
import { type SignUpFormValues, signUpSchema } from "@/src/lib/schemas/auth";

export default function CadastroPage() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      acceptedLgpd: false,
    },
  });

  const isLoading = isSubmitting || isGoogleLoading;

  const onSignUp = async (values: SignUpFormValues) => {
    setServerError(null);
    try {
      const cleanEmail = values.email.trim();
      const displayName =
        values.name.trim() || cleanEmail.split("@")[0] || "Pessoa";
      const result = await authClient.signUp.email({
        email: cleanEmail,
        password: values.password,
        name: displayName,
      });
      if (result.error) {
        setServerError(
          result.error.message ||
            "Não foi possível criar sua conta. Verifique os dados.",
        );
        return;
      }
      router.push("/inicio");
      router.refresh();
    } catch {
      setServerError("Erro inesperado ao criar conta. Tente novamente.");
    }
  };

  const handleGoogleSignUp = async () => {
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
            "Cadastro com Google indisponível no momento. Verifique as credenciais OAuth.",
        );
      }
    } catch {
      setServerError(
        "Não foi possível iniciar o cadastro com Google. Verifique a configuração OAuth.",
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
          <CardTitle className="text-2xl">Criar conta no befin</CardTitle>
          <CardDescription>
            Coletamos apenas o mínimo necessário: seu e-mail (e nome opcional).
            Sem CPF, telefone ou endereço.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-2 rounded-2xl bg-sage-bg/55 p-3 text-xs text-sage-text">
            <LockSimple size={16} weight="fill" className="mt-0.5 shrink-0" />
            <span>
              <strong>LGPD:</strong> Ao usar o Google, recebemos apenas nome e
              e-mail do seu perfil para autenticação e sync das caixinhas.
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
          >
            <GoogleLogo size={18} weight="bold" />
            Cadastrar com Google
          </Button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-border-subtle" />
            <span className="mx-3 text-xs text-text-secondary">
              ou com e-mail
            </span>
            <div className="flex-grow border-t border-border-subtle" />
          </div>

          <form
            onSubmit={handleSubmit(onSignUp)}
            noValidate
            className="flex flex-col gap-3.5"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-name">Como prefere ser chamada(o)? (opcional)</Label>
              <Input
                id="signup-name"
                type="text"
                autoComplete="nickname"
                placeholder="Ex: Ana"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs font-medium text-coral-text">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signup-email">E-mail</Label>
              <Input
                id="signup-email"
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
              <Label htmlFor="signup-password">Senha (mínimo 8 caracteres)</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs font-medium text-coral-text">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-border-subtle bg-canvas p-3 text-xs leading-relaxed text-text-secondary">
                <Controller
                  control={control}
                  name="acceptedLgpd"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                      aria-label="Aceitar Política de Privacidade e Termos de Uso"
                      className="mt-0.5"
                    />
                  )}
                />
                <span>
                  Li e concordo com a{" "}
                  <Link
                    href="/privacidade"
                    className="font-semibold text-primary underline"
                  >
                    Política de Privacidade (LGPD)
                  </Link>{" "}
                  e os{" "}
                  <Link
                    href="/termos"
                    className="font-semibold text-primary underline"
                  >
                    Termos de Uso
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptedLgpd && (
                <p className="text-xs font-medium text-coral-text">
                  {errors.acceptedLgpd.message}
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
              <UserPlus size={16} weight="bold" />
              {isLoading ? "Criando conta..." : "Criar minha conta"}
            </Button>
          </form>

          <div className="flex flex-col gap-2 border-t border-border-subtle pt-4 text-center text-xs text-text-secondary">
            <p>
              Já possui conta?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary underline"
              >
                Entrar agora
              </Link>
            </p>
            <p>
              Prefere usar sem conta?{" "}
              <Link href="/inicio" className="font-semibold text-primary">
                Continuar como convidado
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
