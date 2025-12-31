import type { ThemeMode } from "@/types";

interface ThemeToggleProps {
  value: ThemeMode;
  effectiveMode: ThemeMode;
  isSystemPreferredDark: boolean;
  onChange: (mode: ThemeMode) => void;
}

export function ThemeToggle({ value, effectiveMode, isSystemPreferredDark, onChange }: ThemeToggleProps) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm" aria-labelledby="theme-toggle-title">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Wygląd</p>
        <h2 id="theme-toggle-title" className="text-xl font-semibold text-foreground">
          Motyw aplikacji
        </h2>
        <p className="text-sm text-muted-foreground">
          Wybierz preferowany motyw. Ustawienie system automatycznie dostosuje się do motywu systemu operacyjnego.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-foreground">Tryb</span>
          <select
            value={value}
            onChange={(event) => onChange(event.target.value as ThemeMode)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="light">Jasny</option>
            <option value="dark">Ciemny</option>
            <option value="system">System</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Aktualnie aktywny motyw: <strong className="font-semibold text-foreground">{effectiveMode}</strong>
          </p>
        </label>

        <div className="space-y-2 rounded-xl border bg-background px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Stan systemu</p>
          <p className="text-muted-foreground">System preferuje: {isSystemPreferredDark ? "ciemny" : "jasny"} tryb.</p>
          <p className="text-muted-foreground">
            Zmiana preferencji systemu automatycznie przełączy motyw, jeśli wybrano opcję „System”.
          </p>
        </div>
      </div>
    </section>
  );
}
