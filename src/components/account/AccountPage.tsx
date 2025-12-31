import { useCallback, useMemo, useState } from "react";

import { useThemeMode } from "@/components/hooks/useThemeMode";
import type { AccountViewModel, ThemeMode } from "@/types";

import { DangerZoneCard } from "./DangerZoneCard";
import { LogoutButton } from "./LogoutButton";
import { ProfileCard } from "./ProfileCard";
import { ThemeToggle } from "./ThemeToggle";

type ToastTone = "success" | "error";

interface ToastState {
  message: string;
  tone: ToastTone;
}

const MOCK_ACCOUNT: AccountViewModel = {
  email: "uzytkownik@example.com",
  registeredAt: "2024-01-15T12:00:00Z",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function AccountPage() {
  const [account] = useState<AccountViewModel>(MOCK_ACCOUNT);
  const { mode, setMode, effectiveMode, isSystemPreferredDark } = useThemeMode();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const headerSubtitle = useMemo(
    () =>
      "Zarządzaj ustawieniami konta, motywem i działaniami krytycznymi. Ten widok jest makietą bez realnych wywołań sieciowych.",
    []
  );

  const showToast = useCallback((message: string, tone: ToastTone) => setToast({ message, tone }), []);

  const handleThemeChange = useCallback(
    (nextMode: ThemeMode) => {
      setToast(null);
      try {
        setMode(nextMode);
        showToast(`Ustawiono motyw: ${nextMode}`, "success");
      } catch {
        showToast("Nie udało się zapisać motywu", "error");
      }
    },
    [setMode, showToast]
  );

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setToast(null);
    try {
      await delay(600);
      window.localStorage.clear();
      showToast("Wylogowano (mock)", "success");
    } catch (error) {
      showToast("Nie udało się wylogować", "error");
      throw error instanceof Error ? error : new Error("logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  }, [showToast]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setToast(null);
    try {
      await delay(800);
      showToast("Konto zostało usunięte (mock)", "success");
    } catch (error) {
      showToast("Nie udało się usunąć konta", "error");
      throw error instanceof Error ? error : new Error("delete failed");
    } finally {
      setIsDeleting(false);
    }
  }, [showToast]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">Konto</p>
          <h1 className="text-3xl font-semibold leading-tight text-foreground">Twój profil i ustawienia</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{headerSubtitle}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <ProfileCard account={account} />
            <ThemeToggle
              value={mode}
              effectiveMode={effectiveMode}
              isSystemPreferredDark={isSystemPreferredDark}
              onChange={handleThemeChange}
            />
          </div>

          <div className="space-y-4">
            <LogoutButton onLogout={handleLogout} isLoggingOut={isLoggingOut} />
            <DangerZoneCard onDelete={handleDelete} isDeleting={isDeleting} />
          </div>
        </div>
      </div>
      {toast ? <InlineToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </main>
  );
}

function InlineToast({ message, tone, onClose }: { message: string; tone: ToastTone; onClose: () => void }) {
  const bg =
    tone === "success"
      ? "border-emerald-200/80 bg-emerald-50 text-emerald-900"
      : "border-destructive/40 bg-destructive/10 text-destructive";

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-md backdrop-blur-sm ${bg}`}
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
