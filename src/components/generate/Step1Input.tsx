import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCharacterCounter, MAX_TEXT_LENGTH, MIN_TEXT_LENGTH } from "../hooks/useCharacterCounter";

interface Step1InputProps {
  text: string;
  onTextChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isSubmitting?: boolean;
}

export function Step1Input({ text, onTextChange, onSubmit, isSubmitting }: Step1InputProps) {
  const [wasTouched, setWasTouched] = useState(false);
  const { length, isTooShort, isTooLong, isValid } = useCharacterCounter(text);
  const shouldValidate = wasTouched;

  const validationMessage = useMemo(() => {
    if (!shouldValidate) {
      return "Wklej tekst (1 000–10 000 znaków) i przejdź dalej.";
    }
    if (isTooShort) {
      return `Wklej co najmniej ${MIN_TEXT_LENGTH} znaków`;
    }
    if (isTooLong) {
      return `Tekst może mieć maksymalnie ${MAX_TEXT_LENGTH} znaków`;
    }
    return "Tekst wygląda dobrze. Przejdź dalej, aby wygenerować fiszki.";
  }, [isTooLong, isTooShort, shouldValidate]);

  const handleTextChange = useCallback(
    (value: string) => {
      if (!wasTouched) {
        setWasTouched(true);
      }
      onTextChange(value);
    },
    [onTextChange, wasTouched]
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!wasTouched) {
        setWasTouched(true);
      }
      if (!isValid) {
        return;
      }
      onSubmit(text);
    },
    [isValid, onSubmit, text, wasTouched]
  );

  return (
    <form className="space-y-4" onSubmit={handleSubmit} aria-labelledby="generate-step1-title">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Krok 1 z 2</p>
        <h2 id="generate-step1-title" className="text-2xl font-semibold text-foreground">
          Wklej tekst źródłowy
        </h2>
        <p className="text-sm text-muted-foreground">
          Wprowadź tekst na podstawie którego zostaną zaproponowane fiszki.
        </p>
      </div>

      <div className="space-y-3">
        <TextareaWithCounter
          value={text}
          onChange={handleTextChange}
          count={length}
          isTooShort={isTooShort}
          isTooLong={isTooLong}
          shouldValidate={shouldValidate}
        />
        <ValidationMessage isValid={isValid} message={validationMessage} shouldValidate={shouldValidate} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "Generowanie..." : "Dalej"}
        </Button>
      </div>
    </form>
  );
}

function TextareaWithCounter({
  value,
  onChange,
  count,
  isTooShort,
  isTooLong,
  shouldValidate,
}: {
  value: string;
  onChange: (value: string) => void;
  count: number;
  isTooShort: boolean;
  isTooLong: boolean;
  shouldValidate: boolean;
}) {
  const statusColor =
    shouldValidate && (isTooShort || isTooLong) ? "border-destructive focus-visible:ring-destructive" : "border-input";

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">Tekst do analizy</span>
      <textarea
        className={`min-h-[240px] w-full rounded-xl border bg-background px-4 py-3 text-base text-foreground shadow-xs outline-none transition focus-visible:ring-2 ${statusColor}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={shouldValidate && (isTooShort || isTooLong)}
        aria-describedby="generate-text-help"
        maxLength={MAX_TEXT_LENGTH}
        placeholder="Wklej tekst (1 000–10 000 znaków)..."
      />
      <div className="flex items-center justify-between text-sm text-muted-foreground" id="generate-text-help">
        <span>{count} znaków</span>
        <span>
          Limit znaków: {MIN_TEXT_LENGTH} – {MAX_TEXT_LENGTH}
        </span>
      </div>
    </label>
  );
}

function ValidationMessage({
  isValid,
  message,
  shouldValidate,
}: {
  isValid: boolean;
  message: string;
  shouldValidate: boolean;
}) {
  const tone = !shouldValidate ? "text-muted-foreground" : isValid ? "text-emerald-600" : "text-destructive";
  return <p className={`text-sm ${tone}`}>{message}</p>;
}
