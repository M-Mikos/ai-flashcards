import { z } from "zod";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const LENGTH_MESSAGE = "Co najmniej 8 znaków";
const UPPERCASE_MESSAGE = "Przynajmniej jedna wielka litera";
const LOWERCASE_MESSAGE = "Przynajmniej jedna mała litera";
const DIGIT_MESSAGE = "Przynajmniej jedna cyfra";
const SPECIAL_CHAR_MESSAGE = "Przynajmniej jeden znak specjalny";

export const passwordRequirements = [
  {
    id: "length",
    label: LENGTH_MESSAGE,
    test: (value: string) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "uppercase",
    label: UPPERCASE_MESSAGE,
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: LOWERCASE_MESSAGE,
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "digit",
    label: DIGIT_MESSAGE,
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "special",
    label: SPECIAL_CHAR_MESSAGE,
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

const trimmedEmail = z.string().trim().email("Podaj prawidłowy adres email");

const strongPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, LENGTH_MESSAGE)
  .max(PASSWORD_MAX_LENGTH, `Hasło może mieć maksymalnie ${PASSWORD_MAX_LENGTH} znaków`)
  .refine(passwordRequirements[1].test, { message: UPPERCASE_MESSAGE })
  .refine(passwordRequirements[2].test, { message: LOWERCASE_MESSAGE })
  .refine(passwordRequirements[3].test, { message: DIGIT_MESSAGE })
  .refine(passwordRequirements[4].test, { message: SPECIAL_CHAR_MESSAGE });

export const loginSchema = z.object({
  email: trimmedEmail,
  password: z.string().min(1, "Podaj hasło"),
});

export const registerSchema = z
  .object({
    email: trimmedEmail,
    password: strongPassword,
    confirmPassword: z.string().min(1, "Potwierdź hasło"),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Hasła muszą się zgadzać",
      });
    }
  });

export const resetRequestSchema = z.object({
  email: trimmedEmail,
});

export const resetConfirmSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string().min(1, "Potwierdź hasło"),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Hasła muszą się zgadzać",
      });
    }
  });
