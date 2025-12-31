import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BulkCreateFlashcardsCommand, SourceEnum } from "@/types";
import { bulkCreateFlashcardsClient } from "@/lib/api/flashcards.client";
import type { FlashcardProposal } from "./types";
import { CheckCircle2, XCircle } from "lucide-react";

interface Step2ProposalsProps {
  generationId: string | null;
  proposals: FlashcardProposal[];
  onUpdate: (id: string, patch: Partial<FlashcardProposal>) => void;
  onSetProposals: (next: FlashcardProposal[]) => void;
  onDone: () => void;
  onReset: () => void;
}

export function Step2Proposals({
  generationId,
  proposals,
  onUpdate,
  onSetProposals,
  onDone,
  onReset,
}: Step2ProposalsProps) {
  const [editing, setEditing] = useState<FlashcardProposal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const handleAccept = useCallback(
    (id: string) => {
      onUpdate(id, { state: "accepted" });
    },
    [onUpdate]
  );

  const handleReject = useCallback(
    (id: string) => {
      onUpdate(id, { state: "rejected" });
    },
    [onUpdate]
  );

  const handleResetStatus = useCallback(
    (id: string) => {
      onUpdate(id, { state: "pending" });
    },
    [onUpdate]
  );

  const handleEditSave = useCallback(
    (id: string, front: string, back: string) => {
      onUpdate(id, { front, back, state: "edited" });
      setEditing(null);
    },
    [onUpdate]
  );

  const acceptedCount = useMemo(() => proposals.filter((p) => p.state === "accepted").length, [proposals]);
  const rejectedCount = useMemo(() => proposals.filter((p) => p.state === "rejected").length, [proposals]);
  const hasSavable = useMemo(() => proposals.some((p) => p.state !== "rejected"), [proposals]);

  const handleAcceptAll = useCallback(async () => {
    const toSave = proposals.filter((proposal) => proposal.state !== "rejected");
    if (toSave.length === 0) {
      setToast({ message: "Brak kart do zapisania", tone: "error" });
      return;
    }

    const payload: BulkCreateFlashcardsCommand = {
      generationId: generationId ?? null,
      flashcards: toSave.map((proposal) => ({
        front: proposal.front,
        back: proposal.back,
        source: proposal.state === "edited" ? ("ai_edited" as SourceEnum) : ("ai_generated" as SourceEnum),
      })),
    };

    setIsSaving(true);
    try {
      await bulkCreateFlashcardsClient({ payload });
      setToast({ message: "Zapisano fiszki", tone: "success" });
      onSetProposals([]);
      onDone();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Nie udało się zapisać fiszek",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [generationId, onDone, onSetProposals, proposals]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Krok 2 z 2</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Propozycje AI</h2>
            <p className="text-sm text-muted-foreground">
              Zweryfikuj, edytuj lub odrzuć. Następnie zapisz zaakceptowane fiszki.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Tag label={`Akceptowane: ${acceptedCount}`} />
            <Tag label={`Odrzucone: ${rejectedCount}`} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Karty do weryfikacji: {proposals.length}</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onReset}>
            Zacznij od nowa
          </Button>
          <Button onClick={handleAcceptAll} disabled={!hasSavable || isSaving}>
            {isSaving ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </div>
      </div>

      {proposals.length === 0 ? (
        <EmptyState onReset={onReset} />
      ) : (
        <AIFlashcardGrid
          proposals={proposals}
          onAccept={handleAccept}
          onReject={handleReject}
          onEdit={setEditing}
          onResetStatus={handleResetStatus}
        />
      )}

      {editing ? (
        <EditDialog proposal={editing} onClose={() => setEditing(null)} onSave={handleEditSave} isSaving={isSaving} />
      ) : null}

      {toast ? <InlineToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

function AIFlashcardGrid({
  proposals,
  onAccept,
  onReject,
  onEdit,
  onResetStatus,
}: {
  proposals: FlashcardProposal[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (proposal: FlashcardProposal) => void;
  onResetStatus: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {proposals.map((proposal) => (
        <FlashcardCard
          key={proposal.id}
          proposal={proposal}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onEdit}
          onResetStatus={onResetStatus}
        />
      ))}
    </div>
  );
}

function FlashcardCard({
  proposal,
  onAccept,
  onReject,
  onEdit,
  onResetStatus,
}: {
  proposal: FlashcardProposal;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (proposal: FlashcardProposal) => void;
  onResetStatus: (id: string) => void;
}) {
  const isAccepted = proposal.state === "accepted";
  const isRejected = proposal.state === "rejected";
  const isReviewed = isAccepted || isRejected;

  return (
    <article className="group flex h-full flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition hover:border-ring hover:bg-accent">
      <div className="space-y-2">
        <p className="line-clamp-3 text-base font-semibold leading-tight text-foreground">{proposal.front}</p>
        <p className="line-clamp-4 text-sm text-muted-foreground">{proposal.back}</p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {isReviewed ? (
          <>
            <StatusBadge state={proposal.state} />
            <Button size="sm" variant="outline" onClick={() => onResetStatus(proposal.id)}>
              Zmień
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => onEdit(proposal)}>
              Edytuj
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onReject(proposal.id)}>
              Odrzuć
            </Button>
            <Button size="sm" onClick={() => onAccept(proposal.id)}>
              Akceptuj
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function EditDialog({
  proposal,
  onClose,
  onSave,
  isSaving,
}: {
  proposal: FlashcardProposal;
  onClose: () => void;
  onSave: (id: string, front: string, back: string) => void;
  isSaving: boolean;
}) {
  const [front, setFront] = useState(proposal.front);
  const [back, setBack] = useState(proposal.back);
  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});

  const validate = useCallback(() => {
    const next: { front?: string; back?: string } = {};
    if (!front.trim() || front.trim().length > 200) {
      next.front = "Front musi mieć 1-200 znaków";
    }
    if (!back.trim() || back.trim().length > 500) {
      next.back = "Back musi mieć 1-500 znaków";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [back, front]);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!validate()) return;
      onSave(proposal.id, front.trim(), back.trim());
    },
    [back, front, onSave, proposal.id, validate]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Edycja fiszki</p>
            <h3 className="text-lg font-semibold text-foreground">Popraw treść</h3>
          </div>
          <button
            type="button"
            className="rounded-full p-1 text-muted-foreground transition hover:bg-muted"
            onClick={onClose}
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Front" error={errors.front}>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              className={cn(
                "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                errors.front ? "border-destructive" : "border-input"
              )}
              maxLength={200}
              required
            />
          </Field>
          <Field label="Back" error={errors.back}>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              className={cn(
                "min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                errors.back ? "border-destructive" : "border-input"
              )}
              maxLength={500}
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function InlineToast({ message, tone, onClose }: { message: string; tone: "success" | "error"; onClose: () => void }) {
  const bg =
    tone === "success"
      ? "border-emerald-200/80 bg-emerald-50 text-emerald-900"
      : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center">
      <div
        className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-md backdrop-blur-sm", bg)}
        role="status"
      >
        <span>{message}</span>
        <button
          type="button"
          className="text-muted-foreground transition hover:text-foreground"
          onClick={onClose}
          aria-label="Zamknij powiadomienie"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-muted/30 px-6 py-10 text-center">
      <p className="text-base font-medium">Brak widocznych propozycji.</p>
      <p className="text-sm text-muted-foreground">Wróć do tekstu źródłowego lub odśwież generację.</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset}>
          Zacznij od nowa
        </Button>
        <Button onClick={onReset}>Wygeneruj ponownie</Button>
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-input bg-muted px-3 py-1 text-xs text-muted-foreground">{label}</span>
  );
}

function StatusBadge({ state }: { state: FlashcardProposal["state"] }) {
  const isAccepted = state === "accepted";
  const tone = isAccepted
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-destructive/40 bg-destructive/10 text-destructive";
  const Icon = isAccepted ? CheckCircle2 : XCircle;
  const label = isAccepted ? "Zaakceptowano" : "Odrzucono";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium", tone)}>
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </span>
  );
}
