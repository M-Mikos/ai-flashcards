"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "../ui/button";
import { AuthCard } from "./AuthCard";
import { FormField } from "./FormField";
import { resetRequestSchema } from "@/lib/validation/authSchemas";

type ResetRequestFormValues = z.infer<typeof resetRequestSchema>;

interface ResetRequestStatus {
  type: "success" | "error";
  message: string;
}

interface ResetRequestFormProps {
  onSubmit?: (values: ResetRequestFormValues) => Promise<void>;
}

export function ResetRequestForm({ onSubmit = async () => {} }: ResetRequestFormProps) {
  const [formValues, setFormValues] = useState<ResetRequestFormValues>({ email: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof ResetRequestFormValues, string>>>({});
  const [status, setStatus] = useState<ResetRequestStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailId = useId();

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus(null);
      const parsed = resetRequestSchema.safeParse(formValues);
      if (!parsed.success) {
        const fieldErrors = Object.entries(parsed.error.formErrors.fieldErrors).reduce(
          (acc, [key, value]) => {
            if (value && value.length) {
              acc[key as keyof ResetRequestFormValues] = value[0];
            }
            return acc;
          },
          {} as Partial<Record<keyof ResetRequestFormValues, string>>
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
          message: "Jeśli konto istnieje, wkrótce otrzymasz link do resetu hasła.",
        });
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "Nie udało się wysłać instrukcji.",
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
      title="Reset hasła"
      description="Podaj adres email, a wyślemy instrukcje resetu."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Możesz też zalogować się ponownie</span>
          <a className="underline" href="/auth/login">
            Powrót do logowania
          </a>
          <a className="underline" href="/auth/register">
            Zarejestruj się
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
          <FormField label="Email" htmlFor={`${emailId}-email`} error={errors.email}>
            <input
              id={`${emailId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              value={formValues.email}
              onChange={(event) => {
                setFormValues({ email: event.target.value });
                setErrors({});
                setStatus(null);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="you@example.com"
              required
            />
          </FormField>
          <div className="text-xs text-muted-foreground">
            Nie ujawniamy, czy konto istnieje. Informację o kolejnym kroku otrzymasz w każdym przypadku.
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Wysyłanie..." : "Wyślij instrukcje"}
            </Button>
          </div>
        </form>
      </div>
    </AuthCard>
  );
}
