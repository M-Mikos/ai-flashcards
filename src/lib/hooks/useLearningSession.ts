import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  Grade,
  LearningCardVM,
  LearningSessionCommand,
  LearningSessionResponse,
  LearningSessionVM,
  SessionStats,
} from "@/types";

const initialSession: LearningSessionVM = {
  cards: [],
  currentIndex: 0,
  finished: false,
};

function mapToViewModel(response: LearningSessionResponse): LearningSessionVM {
  const cards: LearningCardVM[] = response.cards.map((card) => ({
    ...card,
    flipped: false,
  }));

  return {
    cards,
    currentIndex: 0,
    finished: cards.length === 0,
  };
}

function calculateStats(cards: LearningCardVM[]): SessionStats {
  const graded = cards.filter((card) => typeof card.grade === "number");
  if (!graded.length) {
    return { avgGrade: 0, total: 0 };
  }
  const sum = graded.reduce((acc, card) => acc + (card.grade ?? 0), 0);
  return { avgGrade: Number((sum / graded.length).toFixed(2)), total: graded.length };
}

export interface UseLearningSessionResult {
  session: LearningSessionVM;
  currentCard: LearningCardVM | undefined;
  stats: SessionStats;
  loading: boolean;
  error: string | null;
  fetchSession: (payload?: LearningSessionCommand) => Promise<void>;
  reset: () => void;
  flip: () => void;
  score: (grade: Grade) => void;
  next: () => void;
}

export function useLearningSession(defaultPayload: LearningSessionCommand = { count: 10 }): UseLearningSessionResult {
  const [session, setSession] = useState<LearningSessionVM>(initialSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialPayloadRef = useRef<LearningSessionCommand>(defaultPayload);

  const fetchSession = useCallback(async (payload?: LearningSessionCommand) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const requestPayload = payload ?? initialPayloadRef.current ?? {};

    try {
      const response = await fetch("/api/learning/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = "Nie udało się pobrać sesji nauki";
        try {
          const errorBody = (await response.json()) as { error?: string };
          message = errorBody.error ?? message;
        } catch {
          message = response.statusText || message;
        }
        throw new Error(message);
      }

      const data = (await response.json()) as LearningSessionResponse;
      setSession(mapToViewModel(data));
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      const message = err instanceof Error ? err.message : "Nie udało się pobrać sesji nauki";
      setError(message);
      setSession(initialSession);
    } finally {
      setLoading(false);
    }
  }, []);

  const flip = useCallback(() => {
    setSession((prev) => {
      if (prev.finished) {
        return prev;
      }
      const card = prev.cards[prev.currentIndex];
      if (!card || typeof card.grade === "number") {
        return prev;
      }
      const cards = [...prev.cards];
      cards[prev.currentIndex] = { ...card, flipped: !card.flipped };
      return { ...prev, cards };
    });
  }, []);

  const next = useCallback(() => {
    setSession((prev) => {
      const hasNext = prev.currentIndex + 1 < prev.cards.length;
      if (!hasNext) {
        return { ...prev, finished: true };
      }
      return { ...prev, currentIndex: prev.currentIndex + 1 };
    });
  }, []);

  const score = useCallback((grade: Grade) => {
    if (!Number.isFinite(grade) || grade < 0 || grade > 5) {
      return;
    }

    setSession((prev) => {
      if (prev.finished) {
        return prev;
      }

      const card = prev.cards[prev.currentIndex];
      if (!card || !card.flipped || typeof card.grade === "number") {
        return prev;
      }

      const cards = [...prev.cards];
      cards[prev.currentIndex] = { ...card, grade };

      const isLast = prev.currentIndex === prev.cards.length - 1;
      const nextIndex = isLast ? prev.currentIndex : prev.currentIndex + 1;

      return {
        cards,
        currentIndex: nextIndex,
        finished: isLast,
      };
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setSession(initialSession);
    setError(null);
  }, []);

  const currentCard = useMemo(() => session.cards[session.currentIndex], [session.cards, session.currentIndex]);
  const stats = useMemo(() => calculateStats(session.cards), [session.cards]);

  useEffect(() => {
    fetchSession().catch(() => {
      /* handled in state */
    });
    return () => abortRef.current?.abort();
  }, [fetchSession]);

  return {
    session,
    currentCard,
    stats,
    loading,
    error,
    fetchSession,
    reset,
    flip,
    score,
    next,
  };
}
