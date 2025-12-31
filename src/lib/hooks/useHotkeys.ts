import { useEffect } from "react";

import type { Grade } from "@/types";

export interface UseHotkeysOptions {
  onFlip?: () => void;
  onScore?: (grade: Grade) => void;
  enabled?: boolean;
}

export function useHotkeys({ onFlip, onScore, enabled = true }: UseHotkeysOptions) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handler = (event: KeyboardEvent) => {
      const key = event.key;

      if (key === " " || key === "Spacebar" || key === "Enter") {
        event.preventDefault();
        onFlip?.();
        return;
      }

      if (key === "ArrowLeft") {
        event.preventDefault();
        onFlip?.();
        return;
      }

      if (key === "ArrowRight") {
        event.preventDefault();
        onScore?.(5);
        return;
      }

      if (/^[0-5]$/.test(key)) {
        event.preventDefault();
        onScore?.(Number(key) as Grade);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onFlip, onScore]);
}
