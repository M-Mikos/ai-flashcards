import { useHotkeys } from "@/lib/hooks/useHotkeys";
import type { Grade } from "@/types";

interface HotkeyHandlerProps {
  onFlip: () => void;
  onScore: (grade: Grade) => void;
  disabled?: boolean;
}

export function HotkeyHandler({ onFlip, onScore, disabled }: HotkeyHandlerProps) {
  useHotkeys({ onFlip, onScore, enabled: !disabled });
  return <div aria-hidden className="sr-only" />;
}
