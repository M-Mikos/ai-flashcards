"use client";

import { cn } from "@/lib/utils";

import { passwordRequirements } from "@/lib/validation/authSchemas";

export function PasswordRequirementList({ value }: { value: string }) {
  return (
    <ul className="grid gap-1 text-xs sm:text-sm">
      {passwordRequirements.map((requirement) => {
        const met = requirement.test(value);
        return (
          <li key={requirement.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border text-[0.6rem] font-semibold leading-none transition",
                met ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-border text-muted-foreground"
              )}
              aria-hidden="true"
            >
              {met ? "✓" : ""}
            </span>
            <span className={cn("leading-snug", met ? "text-foreground" : "text-muted-foreground")}>
              {requirement.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
