import type { LearningCardVM } from "@/types";

interface LearningCardProps {
  card: LearningCardVM;
  onFlip: () => void;
}

export function LearningCard({ card, onFlip }: LearningCardProps) {
  const showBack = card.flipped;
  const isLocked = typeof card.grade === "number";

  return (
    <button
      type="button"
      onClick={onFlip}
      disabled={isLocked}
      aria-expanded={showBack}
      className="group relative w-full overflow-hidden rounded-2xl border bg-card px-6 py-10 text-left shadow-sm transition focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none disabled:cursor-not-allowed"
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/[0.02] dark:to-white/5" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>{showBack ? "Odpowiedź" : "Pytanie"}</span>
          {isLocked ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Oceniona</span>
          ) : null}
        </div>
        <div className="min-h-[160px] text-lg font-semibold leading-relaxed text-foreground">
          {showBack ? (card.back ?? "Brak odpowiedzi. Ocena możliwa po sprawdzeniu.") : card.front}
        </div>
        <p className="text-sm text-muted-foreground">
          Kliknij lub naciśnij Space/Enter, aby {showBack ? "wrócić do pytania" : "sprawdzić odpowiedź"}.
        </p>
      </div>
    </button>
  );
}
