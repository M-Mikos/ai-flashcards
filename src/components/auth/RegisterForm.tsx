"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "../ui/button";
import { AuthCard } from "./AuthCard";
import { FormField } from "./FormField";
import { PasswordRequirementList } from "./PasswordRequirementList";
import { registerSchema } from "@/lib/validation/authSchemas";

type RegisterFormValues = z.infer<typeof registerSchema>;

interface FormStatus {
  type: "success" | "error";
  message: string;
}

interface RegisterFormProps {
  onSubmit?: (values: RegisterFormValues) => Promise<void>;
}

export function RegisterForm({ onSubmit = async () => {} }: RegisterFormProps) {
  const [formValues, setFormValues] = useState<RegisterFormValues>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormValues, string>>>({});
  const [status, setStatus] = useState<FormStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseId = useId();

  const handleChange = useCallback((field: keyof RegisterFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setStatus(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus(null);
      const parsed = registerSchema.safeParse(formValues);
      if (!parsed.success) {
        const fieldErrors = Object.entries(parsed.error.formErrors.fieldErrors).reduce(
          (acc, [key, value]) => {
            if (value && value.length) {
              acc[key as keyof RegisterFormValues] = value[0];
            }
            return acc;
          },
          {} as Partial<Record<keyof RegisterFormValues, string>>
        );
        setErrors(fieldErrors);
        return;
      }

      setErrors({});
      setIsSubmitting(true);
      try {
        await onSubmit(parsed.data);
        setStatus({
          type: "success",
          message: "Formularz gotowy, połączymy go z backendem w kolejnym kroku.",
        });
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "Nie udało się zarejestrować.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, onSubmit]
  );

  const statusClasses = useMemo(() => {
    if (!status) return "";
    return status.type === "success"
      ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
      : "rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive";
  }, [status]);

  return (
    <AuthCard
      title="Rejestracja"
      description="Dodaj email oraz silne hasło, aby utworzyć konto."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Masz już konto?</span>
          <a className="underline" href="/auth/login">
            Zaloguj się
          </a>
          <a className="underline" href="/auth/reset">
            Zapomniałeś hasła?
          </a>
        </div>
      }
    >
      <div className="space-y-4">
        {status ? (
          <div className={statusClasses} role="status" aria-live="polite">
            {status.message}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <FormField label="Email" htmlFor={`${baseId}-email`} error={errors.email}>
            <input
              id={`${baseId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              value={formValues.email}
              onChange={(event) => handleChange("email", event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="you@example.com"
              required
            />
          </FormField>
          <FormField label="Hasło" htmlFor={`${baseId}-password`} error={errors.password}>
            <input
              id={`${baseId}-password`}
              name="password"
              type="password"
              autoComplete="new-password"
              value={formValues.password}
              onChange={(event) => handleChange("password", event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••••"
              required
            />
            <p className="mt-3 text-xs text-muted-foreground">Hasło musi spełniać poniższe kryteria:</p>
            <PasswordRequirementList value={formValues.password} />
          </FormField>
          <FormField
            label="Potwierdź hasło"
            htmlFor={`${baseId}-confirm`}
            error={errors.confirmPassword}
            helper="Wprowadź hasło raz jeszcze, by potwierdzić."
          >
            <input
              id={`${baseId}-confirm`}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={formValues.confirmPassword}
              onChange={(event) => handleChange("confirmPassword", event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••••••••"
              required
            />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Rejestrowanie..." : "Zarejestruj się"}
            </Button>
          </div>
        </form>
      </div>
    </AuthCard>
  );
}
