import { z } from "zod";
import { parseCentsInput } from "@/lib/money";
import {
  envelopeColorSchema,
  paymentMethodSchema,
  transactionTypeSchema,
} from "./sync";

const MAX_AMOUNT_CENTS = 100_000_000_000;

export const positiveMoneyStringSchema = z
  .string()
  .trim()
  .min(1, "Informe um valor.")
  .max(24, "Valor muito longo.")
  .refine((val) => {
    const cents = parseCentsInput(val);
    return Number.isInteger(cents) && cents > 0 && cents <= MAX_AMOUNT_CENTS;
  }, "Informe um valor maior que zero.");

export const nonNegativeMoneyStringSchema = z
  .string()
  .trim()
  .max(24, "Valor muito longo.")
  .refine((val) => {
    if (val === "") return true;
    const cents = parseCentsInput(val);
    return Number.isInteger(cents) && cents >= 0 && cents <= MAX_AMOUNT_CENTS;
  }, "Informe um valor válido.");

export const isoDateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecione uma data válida.");

export const transactionFormSchema = z
  .object({
    type: transactionTypeSchema,
    amount: positiveMoneyStringSchema,
    description: z
      .string()
      .trim()
      .max(200, "Descrição deve ter no máximo 200 caracteres."),
    date: isoDateInputSchema,
    paymentMethod: paymentMethodSchema,
    fromEnvelopeId: z.string(),
    toEnvelopeId: z.string(),
    bankId: z.string(),
    isThirdParty: z.boolean(),
    thirdPartyId: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "EXPENSE" && data.isThirdParty && !data.thirdPartyId) {
      ctx.addIssue({
        code: "custom",
        path: ["thirdPartyId"],
        message: "Selecione ou cadastre quem fez a compra.",
      });
    }
    if (data.type === "TRANSFER" && data.fromEnvelopeId === data.toEnvelopeId) {
      ctx.addIssue({
        code: "custom",
        path: ["toEnvelopeId"],
        message: "A origem e o destino precisam ser diferentes.",
      });
    }
  });

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const quickThirdPartySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do terceiro.")
    .max(80, "Nome deve ter no máximo 80 caracteres."),
});

export type QuickThirdPartyValues = z.infer<typeof quickThirdPartySchema>;

export const bankFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do banco.")
    .max(80, "Nome deve ter no máximo 80 caracteres."),
  balance: nonNegativeMoneyStringSchema,
});

export type BankFormValues = z.infer<typeof bankFormSchema>;

export const envelopeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da caixinha.")
    .max(80, "Nome deve ter no máximo 80 caracteres."),
  color: envelopeColorSchema,
  icon: z.string().trim().min(1).max(40),
  isEmergencyFund: z.boolean(),
});

export type EnvelopeFormValues = z.infer<typeof envelopeFormSchema>;

export const distributeFormSchema = z.object({
  mode: z.enum(["FIXED", "PERCENTAGE"]),
  allocations: z.record(z.string(), nonNegativeMoneyStringSchema),
});

export type DistributeFormValues = z.infer<typeof distributeFormSchema>;

export const reconciliationFormSchema = z.object({
  bankBalances: z.record(z.string(), nonNegativeMoneyStringSchema),
  yieldInputs: z.record(z.string(), nonNegativeMoneyStringSchema),
  notes: z.string().trim().max(500, "Observação deve ter no máximo 500 caracteres."),
});

export type ReconciliationFormValues = z.infer<typeof reconciliationFormSchema>;
