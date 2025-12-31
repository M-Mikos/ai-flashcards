import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLearningSession } from "@/lib/hooks/useLearningSession";
import type { Grade } from "@/types";

import { HotkeyHandler } from "./HotkeyHandler";
import { LearningCard } from "./LearningCard";
import { ProgressCounter } from "./ProgressCounter";
import { ScoreButtons } from "./ScoreButtons";
import { SummaryModal } from "./SummaryModal";

export default function LearningSession() {
  const { session, currentCard, stats, loading, error, fetchSession, flip, score } = useLearningSession();
  const [showSummary, setShowSummary] = useState(false);

  const hasCards = session.cards.length > 0;
  const progressValue = useMemo(() => {
    if (!hasCards) {
      return 0;
    }
    if (session.finished) {
      return session.cards.length;
    }
    return session.currentIndex + (currentCard?.grade ? 1 : 0);
  }, [currentCard?.grade, hasCards, session.cards.length, session.currentIndex, session.finished]);

  const handleScore = useCallback(
    (grade: Grade) => {
      score(grade);
    },
    [score]
  );

  useEffect(() => {
    if (session.finished && session.cards.length > 0) {
      setShowSummary(true);
    }
  }, [session.cards.length, session.finished]);

  const handleRestart = useCallback(() => {
    setShowSummary(false);
    fetchSession().catch(() => {
      /* handled */
    });
  }, [fetchSession]);

  const handleDone = useCallback(() => {
    window.location.href = "/";
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        <header className="space-y-3">
          <p className="text-sm text-muted-foreground">Sesja nauki</p>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold leading-tight text-foreground">Powtarzaj fiszki i oceniaj postęp</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Użyj klawiatury, aby szybko odwracać karty (Space/Enter) i oceniać (0-5 lub strzałka w prawo = 5).
              Przyciskaj kolejne fiszki, aż zobaczysz podsumowanie.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-2 py-1">Space/Enter → odkryj</span>
            <span className="rounded-full border px-2 py-1">0-5 → ocena</span>
            <span className="rounded-full border px-2 py-1">→ → maks. ocena</span>
            <span className="rounded-full border px-2 py-1">← → przełącz pytanie/odpowiedź</span>
          </div>
        </header>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchSession} />
        ) : !hasCards ? (
          <EmptyState onRetry={fetchSession} />
        ) : (
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              <ProgressCounter current={progressValue} total={session.cards.length} />
              {currentCard ? (
                <LearningCard card={currentCard} onFlip={flip} />
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Brak bieżącej karty.
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>Oceń kartę po sprawdzeniu odpowiedzi.</span>
                </div>
                <ScoreButtons
                  disabled={!currentCard?.flipped || typeof currentCard?.grade === "number"}
                  onScore={handleScore}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      <HotkeyHandler onFlip={flip} onScore={handleScore} disabled={loading || showSummary || !hasCards} />

      <SummaryModal open={showSummary} stats={stats} onRestart={handleRestart} onDone={handleDone} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex animate-pulse flex-col gap-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-10 rounded bg-muted" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => Promise<void> | void }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-destructive shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Nie udało się załadować sesji</p>
          <p className="text-sm text-destructive/80">{message}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ onRetry }: { onRetry: () => Promise<void> | void }) {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-foreground">Brak kart do nauki</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Wygląda na to, że nie ma fiszek spełniających kryteria. Dodaj nowe lub spróbuj ponownie.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={onRetry}>Wczytaj ponownie</Button>
      </div>
    </div>
  );
}
