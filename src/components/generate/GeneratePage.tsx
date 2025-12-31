import { useCallback, useMemo, useState } from "react";

import { createGenerationClient } from "@/lib/api/generations.client";
import { useGenerateState } from "../hooks/useGenerateState";
import type { FlashcardProposal, GenerationStep } from "./types";
import { Step1Input } from "./Step1Input";
import { Step2Proposals } from "./Step2Proposals";

export default function GeneratePage() {
  const { state, setText, setStep, setProposals, setGenerationId, updateProposal, reset } = useGenerateState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const handleGenerated = useCallback(
    async (text: string) => {
      setIsGenerating(true);
      setToast(null);
      try {
        const { generation, proposals } = await createGenerationClient({
          payload: { text, model: "gpt-4o-mini" },
        });
        setText(text);
        setGenerationId(generation.id ?? null);
        setProposals(proposals);
        setStep(2);
        setToast({ message: "Wygenerowano propozycje fiszek", tone: "success" });
      } catch (error) {
        setToast({
          message: error instanceof Error ? error.message : "Nie udało się wygenerować propozycji",
          tone: "error",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [setGenerationId, setProposals, setStep, setText]
  );

  const handleBack = useCallback(() => {
    setStep(1);
  }, [setStep]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">Generuj fiszki</p>
          <h1 className="text-3xl font-semibold leading-tight">Przygotuj tekst i wygeneruj propozycje</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Wklej tekst źródłowy, a następnie przejrzyj wygenerowane propozycje fiszek. Ten widok jest w trakcie
            wdrażania – zaczynamy od kroku 1 i struktury całego procesu.
          </p>
        </header>

        <Stepper currentStep={state.step} />

        <section className="rounded-2xl border bg-card px-6 py-6 shadow-sm">
          {state.step === 1 ? (
            <Step1Input
              text={state.text}
              onTextChange={setText}
              onSubmit={handleGenerated}
              isSubmitting={isGenerating}
            />
          ) : (
            <Step2Proposals
              proposals={state.proposals}
              generationId={state.generationId ?? null}
              onUpdate={updateProposal}
              onSetProposals={setProposals}
              onBack={handleBack}
              onReset={handleReset}
              onDone={() => {
                setToast({ message: "Zapisano fiszki, wróć do listy", tone: "success" });
                window.location.href = "/";
              }}
            />
          )}
        </section>
        {toast ? <InlineToast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: GenerationStep }) {
  const steps = useMemo(
    () => [
      { id: 1 as GenerationStep, label: "Tekst" },
      { id: 2 as GenerationStep, label: "Propozycje" },
    ],
    []
  );

  return (
    <ol className="grid grid-cols-2 gap-3">
      {steps.map((step) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const tone = isActive ? "border-ring bg-accent text-foreground" : "border-input bg-muted text-muted-foreground";
        return (
          <li key={step.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${tone}`}>
            <span
              className={`flex size-9 items-center justify-center rounded-full border text-sm font-semibold ${
                isCompleted || isActive
                  ? "border-ring bg-primary text-primary-foreground"
                  : "border-input bg-background"
              }`}
              aria-hidden
            >
              {step.id}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-medium leading-tight">{step.label}</span>
              <span className="text-xs text-muted-foreground">
                {step.id === 1 ? "Wklej i zweryfikuj tekst" : "Przejrzyj propozycje (w przygotowaniu)"}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InlineToast({ message, tone, onClose }: { message: string; tone: "success" | "error"; onClose: () => void }) {
  const bg =
    tone === "success"
      ? "border-emerald-200/80 bg-emerald-50 text-emerald-900"
      : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <div className="fixed inset-x-0 top-4 z-50 flex justify-center">
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
