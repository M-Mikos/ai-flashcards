import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { useFlashcardsList } from "../hooks/useFlashcardsList";
import { Button } from "../ui/button";
import type { SourceEnum } from "../../types";
import type { FlashcardViewModel, SortOption } from "../../lib/view-models/flashcards";

const sourceFilters: { value?: SourceEnum; label: string }[] = [
  { value: undefined, label: "Wszystkie źródła" },
  { value: "ai_generated", label: "AI wygenerowane" },
  { value: "ai_edited", label: "AI edytowane" },
  { value: "manual", label: "Ręczne" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "created_at desc", label: "Najnowsze" },
  { value: "created_at asc", label: "Najstarsze" },
];

function EditIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function MyFlashcardsView() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<FlashcardViewModel | null>(null);
  const [deleting, setDeleting] = useState<FlashcardViewModel | null>(null);
  const {
    items,
    isLoading,
    hasMore,
    error,
    source,
    sort,
    total,
    loadMore,
    loadInitial,
    applySource,
    applySort,
    createOne,
    updateRemote,
    deleteRemote,
  } = useFlashcardsList();

  const { addToast, ToastHost } = useToastHost();

  const sentinelRef = useInfiniteScroll({ canLoad: hasMore && !isLoading, onLoadMore: loadMore });

  const handleDelete = useCallback(async (item: FlashcardViewModel) => {
    setDeleting(item);
  }, []);

  const handleGenerate = useCallback(() => {
    window.location.href = "/generate";
  }, []);

  const handleCreate = useCallback(() => {
    setIsAddOpen(true);
  }, []);

  const handleEdit = useCallback((item: FlashcardViewModel) => {
    setEditing(item);
  }, []);

  const emptyState = !isLoading && items.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        <TopBar onGenerate={handleGenerate} onCreate={handleCreate} />
        <FiltersBar
          source={source}
          sort={sort}
          onSourceChange={(value) => applySource(value)}
          onSortChange={(value) => applySort(value)}
        />

        {error ? <InlineAlert message={error} onRetry={() => loadInitial()} /> : null}

        {emptyState ? (
          <EmptyState onCreate={handleCreate} onGenerate={handleGenerate} />
        ) : (
          <InfiniteFlashcardGrid
            items={items}
            isLoading={isLoading}
            hasMore={hasMore}
            onEdit={handleEdit}
            onDelete={handleDelete}
            sentinelRef={sentinelRef}
            total={total}
            error={error}
            onRetry={loadMore}
          />
        )}

        <ProgressIndicator total={total} visible={!emptyState} isLoading={isLoading} />

        <AddFlashcardDialog
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onCreated={async (payload) => {
            try {
              await createOne({ payload });
              addToast({ type: "success", message: "Fiszka utworzona" });
              setIsAddOpen(false);
            } catch (err) {
              addToast({ type: "error", message: err instanceof Error ? err.message : "Nie udało się utworzyć" });
            }
          }}
        />
        <EditFlashcardDialog
          item={editing}
          isOpen={Boolean(editing)}
          onClose={() => setEditing(null)}
          onUpdated={async (payload) => {
            if (!editing) return;
            try {
              const updated = await updateRemote({ id: editing.id, payload });
              setEditing(updated);
              addToast({ type: "success", message: "Zaktualizowano fiszkę" });
              setEditing(null);
            } catch (err) {
              addToast({ type: "error", message: err instanceof Error ? err.message : "Nie udało się zapisać" });
            }
          }}
        />
        <DeleteFlashcardDialog
          item={deleting}
          isOpen={Boolean(deleting)}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            if (!deleting) return;
            try {
              await deleteRemote({ id: deleting.id });
              addToast({ type: "success", message: "Usunięto fiszkę" });
              setDeleting(null);
            } catch (err) {
              addToast({ type: "error", message: err instanceof Error ? err.message : "Nie udało się usunąć" });
            }
          }}
        />
        <ToastHost />
      </div>
    </div>
  );
}

function TopBar({ onGenerate, onCreate }: { onGenerate: () => void; onCreate: () => void }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Moje fiszki</p>
        <h1 className="text-2xl font-semibold leading-tight">Zapisane fiszki</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onGenerate}>
          Generuj
        </Button>
        <Button onClick={onCreate}>Utwórz</Button>
      </div>
    </header>
  );
}

function FiltersBar({
  source,
  sort,
  onSourceChange,
  onSortChange,
}: {
  source?: SourceEnum;
  sort: SortOption;
  onSourceChange: (value?: SourceEnum) => void;
  onSortChange: (value: SortOption) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {sourceFilters.map((option) => (
          <FilterPill
            key={option.label}
            active={source === option.value || (!source && option.value === undefined)}
            onClick={() => onSourceChange(option.value)}
          >
            {option.label}
          </FilterPill>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sortuj:</span>
        <select
          className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function InfiniteFlashcardGrid({
  items,
  isLoading,
  hasMore,
  onEdit,
  onDelete,
  sentinelRef,
  total,
  error,
  onRetry,
}: {
  items: FlashcardViewModel[];
  isLoading: boolean;
  hasMore: boolean;
  onEdit: (item: FlashcardViewModel) => void;
  onDelete: (item: FlashcardViewModel) => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  total: number;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <FlashcardCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {isLoading && Array.from({ length: 6 }).map((_, index) => <FlashcardSkeleton key={`skeleton-${index}`} />)}
      </div>

      <div ref={sentinelRef} className="h-8 w-full" aria-hidden />

      {!isLoading && hasMore ? (
        <div className="text-center text-sm text-muted-foreground">Wczytywanie kolejnych fiszek...</div>
      ) : null}

      {!hasMore && total > 0 ? (
        <div className="text-center text-sm text-muted-foreground">Wszystkie fiszki są widoczne.</div>
      ) : null}

      {error ? <InlineAlert message={error} onRetry={onRetry} /> : null}
    </section>
  );
}

function FlashcardCard({
  item,
  onEdit,
  onDelete,
}: {
  item: FlashcardViewModel;
  onEdit: (item: FlashcardViewModel) => void;
  onDelete: (item: FlashcardViewModel) => void;
}) {
  const sourceLabel = useMemo(() => {
    switch (item.source) {
      case "ai_generated":
        return "AI";
      case "ai_edited":
        return "AI (edyt.)";
      default:
        return "Ręczne";
    }
  }, [item.source]);

  return (
    <article className="group flex h-full flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition hover:border-ring hover:bg-accent hover:shadow-md">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-3 text-base font-medium leading-tight text-foreground">{item.front}</p>
          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {sourceLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{item.createdLabel}</p>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
        <Button size="icon" variant="ghost" aria-label="Edytuj fiszkę" onClick={() => onEdit(item)}>
          <EditIcon />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive"
          aria-label="Usuń fiszkę"
          onClick={() => onDelete(item)}
        >
          <TrashIcon />
        </Button>
      </div>
    </article>
  );
}

function FlashcardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border bg-muted/30 p-4">
      <div className="mb-3 h-4 w-10/12 rounded bg-muted" />
      <div className="mb-2 h-4 w-9/12 rounded bg-muted" />
      <div className="h-4 w-6/12 rounded bg-muted" />
    </div>
  );
}

interface FlashcardFormState {
  front: string;
  back: string;
}

const defaultFormState: FlashcardFormState = {
  front: "",
  back: "",
};

function validateForm(state: FlashcardFormState) {
  const errors: Partial<Record<keyof FlashcardFormState, string>> = {};
  if (!state.front.trim() || state.front.trim().length < 1 || state.front.trim().length > 200) {
    errors.front = "Front musi mieć 1-200 znaków";
  }
  if (!state.back.trim() || state.back.trim().length < 1 || state.back.trim().length > 500) {
    errors.back = "Back musi mieć 1-500 znaków";
  }
  return errors;
}

function AddFlashcardDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (payload: {
    front: string;
    back: string;
    source: SourceEnum;
    generationId: string | null;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState<FlashcardFormState>(defaultFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof FlashcardFormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(defaultFormState);
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    setSubmitting(true);
    try {
      await onCreated({
        front: form.front.trim(),
        back: form.back.trim(),
        source: "manual",
        generationId: null,
      });
    } catch (err) {
      setErrors({ front: err instanceof Error ? err.message : "Nie udało się utworzyć" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog onClose={onClose} title="Utwórz fiszkę">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field
          label="Front"
          error={errors.front}
          input={
            <textarea
              value={form.front}
              onChange={(e) => setForm((prev) => ({ ...prev, front: e.target.value }))}
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={200}
              required
            />
          }
        />
        <Field
          label="Back"
          error={errors.back}
          input={
            <textarea
              value={form.back}
              onChange={(e) => setForm((prev) => ({ ...prev, back: e.target.value }))}
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={500}
              required
            />
          }
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditFlashcardDialog({
  item,
  isOpen,
  onClose,
  onUpdated,
}: {
  item: FlashcardViewModel | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (payload: { front?: string; back?: string }) => Promise<void>;
}) {
  const [form, setForm] = useState<FlashcardFormState>(defaultFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof FlashcardFormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item && isOpen) {
      setForm({
        front: item.front,
        back: item.back,
      });
      setErrors({});
    }
  }, [item, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;
    const validation = validateForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    setSubmitting(true);
    try {
      await onUpdated({
        front: form.front.trim(),
        back: form.back.trim(),
      });
    } catch (err) {
      setErrors({ front: err instanceof Error ? err.message : "Nie udało się zaktualizować" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <Dialog onClose={onClose} title="Edytuj fiszkę">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field
          label="Front"
          error={errors.front}
          input={
            <textarea
              value={form.front}
              onChange={(e) => setForm((prev) => ({ ...prev, front: e.target.value }))}
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={200}
              required
            />
          }
        />
        <Field
          label="Back"
          error={errors.back}
          input={
            <textarea
              value={form.back}
              onChange={(e) => setForm((prev) => ({ ...prev, back: e.target.value }))}
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={500}
              required
            />
          }
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteFlashcardDialog({
  item,
  isOpen,
  onClose,
  onDeleted,
}: {
  item: FlashcardViewModel | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!item) return;
    setSubmitting(true);
    try {
      await onDeleted();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <Dialog onClose={onClose} title="Usuń fiszkę">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Czy na pewno chcesz usunąć tę fiszkę?</p>
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{item.front}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button type="button" variant="destructive" disabled={submitting} onClick={handleDelete}>
            {submitting ? "Usuwanie..." : "Usuń"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function Field({ label, error, input }: { label: string; error?: string; input: React.ReactNode }) {
  return (
    <label className="flex w-full flex-col gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {input}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-xl border bg-card p-5 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Formularz</p>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
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
        {children}
      </div>
    </div>
  );
}

function InlineAlert({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
      <span className="line-clamp-2">{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}

type ToastKind = "success" | "error";

function useToastHost() {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastKind }[]>([]);

  const addToast = useCallback((toast: { message: string; type: ToastKind }) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const ToastHost = useCallback(() => {
    if (toasts.length === 0) return null;
    return (
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 shadow-md backdrop-blur-sm transition",
              toast.type === "success"
                ? "border-emerald-200/80 bg-emerald-50 text-emerald-900"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    );
  }, [toasts]);

  return { addToast, ToastHost };
}

function ProgressIndicator({ total, visible, isLoading }: { total: number; visible: boolean; isLoading: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{`Łącznie: ${total}`}</span>
      {isLoading ? (
        <span className="inline-flex items-center gap-1" aria-label="Ładowanie">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary/70" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary/40" />
        </span>
      ) : null}
    </div>
  );
}

function EmptyState({ onCreate, onGenerate }: { onCreate: () => void; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-10 text-center shadow-sm">
      <p className="text-base font-medium">Nie masz jeszcze żadnych fiszek.</p>
      <p className="text-sm text-muted-foreground">Utwórz własne lub wygeneruj je automatycznie.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={onGenerate}>
          Generuj
        </Button>
        <Button onClick={onCreate}>Utwórz</Button>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition",
        active
          ? "border-primary bg-primary/10 text-primary shadow-xs"
          : "border-input bg-background text-foreground hover:border-ring hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function useInfiniteScroll({ canLoad, onLoadMore }: { canLoad: boolean; onLoadMore: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !canLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && canLoad) {
            onLoadMore();
          }
        });
      },
      {
        rootMargin: "0px 0px 160px 0px",
        threshold: 0.5,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoad, onLoadMore]);

  return ref;
}
