import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { ConfirmationDialog } from "./ConfirmationDialog";

interface DangerZoneCardProps {
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

const CONFIRMATION_TOKEN = "DELETE";

export function DangerZoneCard({ onDelete, isDeleting }: DangerZoneCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const canConfirm = useMemo(() => confirmationText.trim().toUpperCase() === CONFIRMATION_TOKEN, [confirmationText]);

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || isDeleting) {
      return;
    }
    try {
      await onDelete();
      setIsDialogOpen(false);
      setConfirmationText("");
    } catch {
      // keep dialog open to allow another attempt
    }
  }, [canConfirm, isDeleting, onDelete]);

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-destructive">Danger zone</p>
          <h2 className="text-xl font-semibold text-foreground">Usuń konto</h2>
          <p className="text-sm text-destructive/80">
            Usunięcie konta jest nieodwracalne. Dane powiązane z profilem zostaną utracone (mock).
          </p>
        </div>
        <Button variant="destructive" onClick={() => setIsDialogOpen(true)} disabled={isDeleting}>
          Delete account
        </Button>
      </div>

      <ConfirmationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onConfirm={handleConfirm}
        loading={isDeleting}
        confirmDisabled={!canConfirm}
        title="Potwierdź usunięcie konta"
        description={`Aby kontynuować, wpisz "${CONFIRMATION_TOKEN}" i potwierdź operację.`}
        confirmLabel="Usuń konto"
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Potwierdzenie</span>
          <input
            type="text"
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            className="w-full rounded-lg border border-destructive/50 bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition focus-visible:ring-2 focus-visible:ring-destructive/60"
            aria-invalid={!canConfirm}
            placeholder={`Wpisz ${CONFIRMATION_TOKEN}`}
          />
          <p className="text-xs text-muted-foreground">
            Wpisz dokładnie {CONFIRMATION_TOKEN}, aby aktywować przycisk potwierdzenia.
          </p>
        </label>
        <div className="flex justify-end text-xs text-muted-foreground">
          {isDeleting ? "Usuwanie..." : canConfirm ? "Gotowe do usunięcia" : "Wymagane potwierdzenie"}
        </div>
      </ConfirmationDialog>
    </section>
  );
}
