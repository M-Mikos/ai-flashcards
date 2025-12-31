# Plan implementacji widoku "Sesja nauki" (`/learn`)

## 1. Przegląd

Widok "Sesja nauki" umożliwia użytkownikowi przeprowadzenie repetycji fiszek zgodnie z algorytmem spaced-repetition. Po załadowaniu sesji aplikacja prezentuje kolejne fiszki (front → flip → back) i pozwala ocenić stopień opanowania (skala 0-5). Po ocenieniu wszystkich kart wyświetlane jest podsumowanie sesji.

## 2. Routing widoku

| Ścieżka  | Plik                    | Notatki                                                                                                     |
| -------- | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/learn` | `src/pages/learn.astro` | Strona Astro z wyłączonym prerender (`export const prerender = false`) i React-ową wyspą `LearningSession`. |

## 3. Struktura komponentów

```
LearningPage (/learn)
 ├─ LearningSession (React island)
 │   ├─ ProgressCounter
 │   ├─ LearningCard
 │   │    └─ FlipWrapper (internal)
 │   ├─ ScoreButtons
 │   ├─ HotkeyHandler (portals / invisible div)
 │   ├─ Toast (Shadcn/ui)
 │   └─ SummaryModal (portal)
 └─ <Astro layout>
```

## 4. Szczegóły komponentów

### 4.1 LearningSession

- **Opis**: Główny kontener logiki sesji; łączy się z API, zarządza stanem kart i ocen.
- **Elementy**: `<ProgressCounter/>`, `<LearningCard/>`, `<ScoreButtons/>`, `<SummaryModal/>`, `<Toast/>`, `<HotkeyHandler/>`.
- **Interakcje**:
  - `useEffect()` → `fetchSession()` przy montowaniu
  - `onFlip` z `LearningCard`
  - `onScore` z `ScoreButtons` / klawiszy
- **Walidacja**:
  - Brak kart → komunikat i przycisk powrotu.
  - Brak auth → redirect do `/login` (middleware).
- **Typy**: `LearningSessionVM`, `LearningStep`, `Grade`.
- **Propsy**: brak – komponent jest samowystarczalny.

### 4.2 LearningCard

- **Opis**: Wyświetla front/back pojedynczej fiszki z animacją flip.
- **Elementy**: `<div role="button" aria-expanded={flipped}>` + Tailwind 3D transform.
- **Interakcje**: `onClick`/`onSpace` → flip, przekazuje `onFlip()` w górę.
- **Walidacja**: blokuje kolejne flipy podczas animacji.
- **Typy**: `LearningCardVM` (id, front, back?, flipped).
- **Propsy**: `{ card: LearningCardVM; onFlip(): void }`.

### 4.3 ProgressCounter

- **Opis**: Pokazuje aktualny postęp `x / total`.
- **Elementy**: licznik + pasek postępu (Tailwind).
- **Propsy**: `{ current: number; total: number }`.

### 4.4 ScoreButtons

- **Opis**: Sześć przycisków ratingu 0-5 (Shadcn Button variant="outline").
- **Interakcje**: `onClick(grade)` → `onScore(grade)`.
- **Walidacja**: disabled, gdy karta nieodwrócona.
- **Propsy**: `{ disabled: boolean; onScore(grade: Grade): void }`.

### 4.5 HotkeyHandler

- **Opis**: Globalny listener klawiszy (Space/Enter → flip, 0-5/→ → score, ← → prev cheat-back).
- **Propsy**: `{ onFlip(): void; onScore(g: Grade): void }`.

### 4.6 SummaryModal

- **Opis**: Po ostatniej karcie pokazuje statystyki (średnia ocen, liczba kart) i CTA „Zakończ”.
- **Propsy**: `{ open: boolean; stats: SessionStats; onClose(): void }`.

## 5. Typy

```ts
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;

export interface LearningCardVM extends LearningSessionCard {
  back?: string; // TODO: backend; fallback fetched lazily
  flipped: boolean;
  grade?: Grade;
}

export interface LearningSessionVM {
  cards: LearningCardVM[];
  currentIndex: number;
  finished: boolean;
}

export interface SessionStats {
  avgGrade: number;
  total: number;
}
```

## 6. Zarządzanie stanem

- **`useLearningSession` (custom hook)**
  - Pobiera karty (`POST /api/learning/session`).
  - Zarządza `cards`, `currentIndex`, `loading`, `error`.
  - Eksponuje metody: `flip()`, `score(grade)`, `next()`.
- **`useHotkeys`** – abstrakcja nad `keydown`.
- Lokalny `useState` dla modala i toastów.

## 7. Integracja API

| Akcja          | Endpoint                                  | Typ żądania                                                              | Typ odpowiedzi            | Obsługa UI                                    |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------ | ------------------------- | --------------------------------------------- |
| `fetchSession` | `POST /api/learning/session`              | `LearningSessionCommand` (opcjonalnie `{ count, source, generationId }`) | `LearningSessionResponse` | ładowanie kart; spinner; error toast          |
| `sendFeedback` | `POST /api/learning/feedback` (planowane) | `LearningFeedbackCommand`                                                | 200 OK                    | wysyłane po `score()` w tle (fire-and-forget) |

## 8. Interakcje użytkownika

1. Wejście na `/learn` ⇒ automatyczny fetch sesji.
2. Klik lub Space/Enter ⇒ flip karty.
3. Klawisze 0-5 lub klik przycisku ⇒ ocena.
4. Po ocenie ⇒ ładowanie kolejnej karty; progress +1.
5. Po ostatniej karcie ⇒ SummaryModal z przyciskiem wróć do fiszek.
6. Toasty dla błędów API, informacji „Brak kart do nauki”.

## 9. Warunki i walidacja

- **`LearningCard`**: przed flipem `!flipped`; po ocenie karta blokuje ponowne oceny.
- **`ScoreButtons`**: disabled, gdy `!flipped`.
- **`useLearningSession`**: waliduje liczby ocen 0-5; ignoruje inne.
- **Auth**: middleware `src/middleware/index.ts` przekierowuje niezalogowanych.

## 10. Obsługa błędów

| Sytuacja                              | Reakcja UI                                                         |
| ------------------------------------- | ------------------------------------------------------------------ |
| 401 Unauthorized                      | Redirect `/login`.                                                 |
| 400/422 Validation                    | Toast z opisem; zatrzymanie sesji.                                 |
| 404 No cards / invalid `generationId` | Komunikat „Brak kart spełniających kryteria”. CTA do `flashcards`. |
| 500                                   | Toast „Błąd serwera”, przycisk „Spróbuj ponownie”.                 |

|

## 11. Kroki implementacji

1. **Routing**: dodaj stronę `src/pages/learn.astro` (prerender = false).
2. **Hooki**: zaimplementuj `useLearningSession.ts` i `useHotkeys.ts` w `src/lib/hooks`.
3. **Komponenty UI**: utwórz folder `src/components/learning` i dodaj `LearningSession.tsx`, `LearningCard.tsx`, `ProgressCounter.tsx`, `ScoreButtons.tsx`, `SummaryModal.tsx`, `HotkeyHandler.tsx`.
4. **Stylowanie**: zastosuj Tailwind + Shadcn; upewnij się o poprawnym focus-ring & aria-live.
5. **Integracja API**: użyj `supabaseClient`/`fetch` w hooku do wywołań; obsłuż token auth via cookies.
6. **Toast & Modal**: wykorzystaj shadcn/ui (`useToast`, `Dialog`).
7. **Edge cases**: zaimplementuj obsługę „brak kart”, ładowanie, błędy.
8. **Hotkeys**: pełna obsługa klawiatury + testy w przeglądarce mobilnej.
9. **Dostępność**: test NVDA/VoiceOver; upewnij się, że fokus nie ucieka podczas flipu.
