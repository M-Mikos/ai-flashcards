import { Button } from "@/components/ui/button";
import type { Grade } from "@/types";

interface ScoreButtonsProps {
  disabled?: boolean;
  onScore: (grade: Grade) => void;
}

const scoreLabels: { grade: Grade; label: string }[] = [
  { grade: 0, label: "0" },
  { grade: 1, label: "1" },
  { grade: 2, label: "2" },
  { grade: 3, label: "3" },
  { grade: 4, label: "4" },
  { grade: 5, label: "5" },
];

export function ScoreButtons({ disabled, onScore }: ScoreButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
      {scoreLabels.map(({ grade, label }) => (
        <Button
          key={grade}
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onScore(grade)}
          aria-label={`Ocena ${label}`}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
