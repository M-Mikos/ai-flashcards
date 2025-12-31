import { Button } from "@/components/ui/button";
import type { SessionStats } from "@/types";

interface SummaryModalProps {
  open: boolean;
  stats: SessionStats;
  onClose: () => void;
  onRestart: () => void;
  onDone: () => void;
}

export function SummaryModal({ open, stats, onClose, onRestart, onDone }: SummaryModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Sesja zakończona</p>
          <h2 className="text-2xl font-semibold text-foreground">Świetna robota!</h2>
          <p className="text-sm text-muted-foreground">
            Poniżej znajdziesz podsumowanie ocen dla tej sesji nauki. Możesz wrócić do listy fiszek lub rozpocząć
            kolejną sesję.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border bg-muted/40 p-4 text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Średnia ocena</p>
            <p className="text-3xl font-bold text-foreground">{stats.avgGrade.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ocenionych fiszek</p>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onDone}>
            Zakończ
          </Button>
          <Button onClick={onRestart}>Nowa sesja</Button>
        </div>
      </div>
    </div>
  );
}
