import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  onLogout: () => Promise<void>;
  isLoggingOut: boolean;
}

export function LogoutButton({ onLogout, isLoggingOut }: LogoutButtonProps) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm" aria-labelledby="logout-title">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Sesja</p>
          <h2 id="logout-title" className="text-xl font-semibold text-foreground">
            Wyloguj się
          </h2>
          <p className="text-sm text-muted-foreground">
            Wylogowanie wyczyści lokalne dane sesji i wróci do ekranu głównego.
          </p>
        </div>
        <Button variant="outline" onClick={onLogout} disabled={isLoggingOut} aria-busy={isLoggingOut}>
          {isLoggingOut ? "Wylogowywanie..." : "Wyloguj"}
        </Button>
      </div>
    </section>
  );
}
