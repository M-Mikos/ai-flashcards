"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { z } from "zod";

import { Button } from "../ui/button";
import { AuthCard } from "./AuthCard";
import { FormField } from "./FormField";
import { PasswordRequirementList } from "./PasswordRequirementList";
import { resetConfirmSchema } from "@/lib/validation/authSchemas";

type ResetConfirmFormValues = z.infer<typeof resetConfirmSchema>;

interface ConfirmStatus {
  type: "success" | "error";
  message: string;
}

interface ResetConfirmFormProps {
  token?: string | null;
  onSubmit?: (values: ResetConfirmFormValues & { token?: string | null }) => Promise<void>;
}

export function ResetConfirmForm({ token, onSubmit = async () => {} }: ResetConfirmFormProps) {
  const [formValues, setFormValues] = useState<ResetConfirmFormValues>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ResetConfirmFormValues, string>>>({});
  const [status, setStatus] = useState<ConfirmStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const baseId = useId();

  const handleChange = useCallback((field: keyof ResetConfirmFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setStatus(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus(null);
      const parsed = resetConfirmSchema.safeParse(formValues);
      if (!parsed.success) {
        const fieldErrors = Object.entries(parsed.error.formErrors.fieldErrors).reduce(
          (acc, [key, value]) => {
            if (value && value.length) {
              acc[key as keyof ResetConfirmFormValues] = value[0];
            }
            return acc;
          },
          {} as Partial<Record<keyof ResetConfirmFormValues, string>>
        );
        setErrors(fieldErrors);
        return;
      }

      setErrors({});
      setIsSubmitting(true);
      try {
        await onSubmit({ ...parsed.data, token });
        setStatus({
          type: "success",
          message: "Hasło zostało zaktualizowane. Wkrótce dodamy przekierowanie do logowania.",
        });
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "Nie udało się zresetować hasła.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, onSubmit, token]
  );

  const statusClasses = useMemo(() => {
    if (!status) return "";
    return status.type === "success"
      ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
      : "rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive";
  }, [status]);

  return (
    <AuthCard
      title="Ustaw nowe hasło"
      description="Podaj nowe, silne hasło. Token z linku resetującego został automatycznie rozpoznany."
    >
      <div className="space-y-4">
        {token ? (
          <p className="text-xs text-muted-foreground">
            Token: <span className="font-mono text-foreground">{token}</span>
          </p>
        ) : null}

        {status ? (
          <div className={statusClasses} role="status" aria-live="polite">
            {status.message}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <FormField label="Nowe hasło" htmlFor={`${baseId}-password`} error={errors.password}>
            <input
              id={`${baseId}-password`}
              name="password"
              type="password"
              autoComplete="new-password"
              value={formValues.password}
              onChange={(event) => handleChange("password", event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="••••••••••••••"
              required
            />
            <p className="mt-3 text-xs text-muted-foreground">Hasło musi spełniać podane kryteria.</p>
            <PasswordRequirementList value={formValues.password} />
          </FormField>

          <FormField
            label="Powtórz nowe hasło"
            htmlFor={`${baseId}-confirm`}
            error={errors.confirmPassword}
            helper="Musi dokładnie zgadzać się z nowym hasłem."
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
              {isSubmitting ? "Aktualizuję..." : "Zapisz nowe hasło"}
            </Button>
          </div>
        </form>
      </div>
    </AuthCard>
  );
}
