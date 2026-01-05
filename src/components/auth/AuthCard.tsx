import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border bg-card/90 p-6 shadow-lg shadow-black/5 dark:shadow-black/40 min-w-xl",
        className
      )}
    >
      <div className="space-y-1 pb-4">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-6">{children}</div>
      {footer ? <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
