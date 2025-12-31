interface ProgressCounterProps {
  current: number;
  total: number;
}

export function ProgressCounter({ current, total }: ProgressCounterProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Postęp</span>
        <span className="font-semibold text-foreground">
          {current} / {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, percent)}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
