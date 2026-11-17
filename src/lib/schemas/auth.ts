import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido.")
    .max(254, "E-mail muito longo."),
  password: z
    .string()
    .min(1, "Informe sua senha.")
    .max(128, "Senha muito longa."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, "Nome deve ter no máximo 80 caracteres."),
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido.")
    .max(254, "E-mail muito longo."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(128, "A senha deve ter no máximo 128 caracteres."),
  acceptedLgpd: z
    .boolean()
    .refine((val) => val === true, {
      message: "Aceite a Política de Privacidade e os Termos de Uso para continuar.",
    }),
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;

export const setPasswordSchema = z.object({
  newPassword: z
    .string({ error: "A senha deve ser um texto válido." })
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(128, "A senha deve ter no máximo 128 caracteres."),
});

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
