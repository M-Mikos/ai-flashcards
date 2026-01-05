"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "../ui/button";
import { AuthCard } from "./AuthCard";
import { FormField } from "./FormField";
import { loginSchema } from "@/lib/validation/authSchemas";

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormStatus {
  type: "success" | "error";
  message: string;
}

interface LoginFormProps {
  onSubmit?: (values: LoginFormValues) => Promise<void>;
}

export function LoginForm({ onSubmit = async () => {} }: LoginFormProps) {
  const [formValues, setFormValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});
  const [status, setStatus] = useState<LoginFormStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseId = useId();

  const handleChange = useCallback((field: keyof LoginFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setStatus(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus(null);
      const parsed = loginSchema.safeParse(formValues);
      if (!parsed.success) {
        const fieldErrors = Object.entries(parsed.error.formErrors.fieldErrors).reduce(
          (acc, [key, value]) => {
            if (value && value.length) {
              acc[key as keyof LoginFormValues] = value[0];
            }
            return acc;
          },
          {} as Partial<Record<keyof LoginFormValues, string>>
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
          message: "Formularz przygotowany do podłączenia logiki autoryzacji.",
        });
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "Nie udało się zalogować.",
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
      title="Logowanie"
      description="Użyj emaila i hasła, aby uzyskać dostęp do panelu."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Nie masz konta?</span>
          <a className="underline" href="/auth/register">
            Zarejestruj się
          </a>
          <a className="underline" href="/auth/reset">
            Nie pamiętasz hasła?
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
          <FormField label="Hasło" htmlFor={`${baseId}-password`} error={errors.password} helper="Minimum 12 znaków.">
            <input
              id={`${baseId}-password`}
              name="password"
              type="password"
              autoComplete="current-password"
              value={formValues.password}
              onChange={(event) => handleChange("password", event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••••••"
              required
            />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Łączenie..." : "Zaloguj się"}
            </Button>
          </div>
        </form>
      </div>
    </AuthCard>
  );
}
