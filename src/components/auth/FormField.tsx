"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  helper?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
}

export function FormField({ label, children, helper, error, htmlFor, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1 text-sm text-foreground bg-transparent", className)}>
      <label htmlFor={htmlFor} className="font-medium">
        {label}
      </label>
      {children}
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
