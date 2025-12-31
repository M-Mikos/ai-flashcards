import { Button } from "@/components/ui/button";
import type { ConfirmDialogProps } from "@/types";

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  confirmDisabled,
  children,
  title,
  description,
  confirmLabel = "Potwierdź",
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg"
      >
        <div className="space-y-2">
          <h3 id="confirm-dialog-title" className="text-xl font-semibold text-foreground">
            {title}
          </h3>
          {description ? (
            <p id="confirm-dialog-description" className="text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-4 space-y-3">{children}</div> : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            aria-busy={loading}
            aria-disabled={confirmDisabled}
          >
            {loading ? "Przetwarzanie..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
