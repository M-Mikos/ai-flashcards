import { useCallback, useEffect, useMemo, useState } from "react";

import type { ThemeMode } from "@/types";

const STORAGE_KEY = "theme-mode";

const isValidThemeMode = (value: unknown): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isSystemPreferredDark, setIsSystemPreferredDark] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setIsSystemPreferredDark(media.matches);

    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    if (isValidThemeMode(storedMode)) {
      setModeState(storedMode);
    }

    const handleMediaChange = (event: MediaQueryListEvent) => {
      setIsSystemPreferredDark(event.matches);
    };

    media.addEventListener("change", handleMediaChange);
    return () => media.removeEventListener("change", handleMediaChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const shouldUseDark = mode === "dark" || (mode === "system" && isSystemPreferredDark);
    const root = document.documentElement;
    root.classList.toggle("dark", shouldUseDark);
    root.setAttribute("data-theme", shouldUseDark ? "dark" : "light");

    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to persist theme mode", error);
    }
  }, [isSystemPreferredDark, mode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    if (!isValidThemeMode(nextMode)) {
      return;
    }
    setModeState(nextMode);
  }, []);

  const effectiveMode = useMemo<ThemeMode>(() => {
    if (mode === "system") {
      return isSystemPreferredDark ? "dark" : "light";
    }
    return mode;
  }, [isSystemPreferredDark, mode]);

  return { mode, setMode, isSystemPreferredDark, effectiveMode };
}
