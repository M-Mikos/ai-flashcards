# Plan implementacji widoku „Generuj fiszki”

## 1. Przegląd

Widok „Generuj” umożliwia użytkownikowi wklejenie fragmentu tekstu (1 000–10 000 znaków) i wygenerowanie na jego podstawie propozycji fiszek przy pomocy modelu AI `gpt-4o-mini`. Proces składa się z dwóch kroków: (1) wprowadzenie i walidacja tekstu, (2) przegląd, akceptacja, edycja lub odrzucenie wygenerowanych propozycji oraz masowe zapisanie zaakceptowanych fiszek do bazy.

## 2. Routing widoku

- **Ścieżka**: `/generate`
- **Dostęp**: tylko dla zalogowanych użytkowników (po MVP – obecnie brak auth, wywołania wykonywane jako `TEST_USER_ID`).

## 3. Struktura komponentów

```
GeneratePage
 ├── Stepper (2 kroki)
 ├── Step1Input
 │     ├── TextareaWithCounter
 │     ├── ValidationMessage
 │     └── NextButton
 └── Step2Proposals
       ├── AIFlashcardGrid
       │     └── FlashcardCard × N
       │           ├── FrontBackPreview
       │           ├── AcceptButton
       │           ├── RejectButton
       │           └── EditButton → EditDialog
       ├── AcceptAllButton
       ├── SkeletonLoader (stan ładowania)
       ├── EmptyState (brak propozycji)
       └── Toast (sukces/ błędy)
```

## 4. Szczegóły komponentów

### 4.1 GeneratePage

- **Opis**: kontener logiki widoku; zarządza routingiem kroków, danymi i stanem globalnym.
- **Główne elementy**: `Stepper`, warunkowe renderowanie `Step1Input` lub `Step2Proposals`.
- **Zdarzenia**: `onNext`, `onBack`, `onReset`.
- **Walidacja**: delegowana do pod-komponentów.
- **Typy**: `GenerateViewState`, `GenerationStep`.
- **Propsy**: brak (strona najwyższego poziomu).

### 4.2 Step1Input

- **Opis**: formularz wklejania tekstu źródłowego.
- **Elementy**: `TextareaWithCounter`, `ValidationMessage`, `Button "Dalej"`.
- **Interakcje**:
  - `onChange` – aktualizuje licznik znaków.
  - `onClick Next` – waliduje i wywołuje API generacji.
- **Walidacja**:
  - min 1 000 znaków; max 10 000 znaków.
  - Blokada przycisku, komunikat błędu.
- **Typy**: `CreateGenerationCommand` (z `src/types.ts`).
- **Propsy**: `onGenerated(result: GenerationCreateResponse, proposals: FlashcardProposal[])`.

### 4.3 TextareaWithCounter

- **Opis**: rozszerzona `textarea` z dynamicznym licznikiem znaków i kolorystyką progu.
- **Interakcje**: `onInput`.
- **Walidacja**: sygnalizacja błędu gdy poza 1 000–10 000.
- **Typy**: `value: string`.
- **Propsy**: `value`, `onChange`.

### 4.4 ValidationMessage

- **Opis**: wyświetla komunikaty walidacyjne.
- **Propsy**: `isValid`, `message`.

### 4.5 Step2Proposals

- **Opis**: zarządza listą propozycji, ich stanem (accepted/edited/rejected) i zapisem.
- **Elementy**: `AIFlashcardGrid`, `AcceptAllButton`, `Toast`.
- **Interakcje**:
  - Accept ↔ Reject ↔ Edit pojedynczej fiszki.
  - „Accept all” zapisuje wszystkie bieżące propozycje poprzez POST `/api/flashcards/bulk`.
- **Walidacja**:
  - limit 200 znaków front / 500 back przy edycji.
  - min 1 karta do zapisu.
- **Typy**: `FlashcardProposal`, `BulkCreateFlashcardsCommand`.
- **Propsy**: `initialProposals`, `generationId`, `onDone`.

### 4.6 AIFlashcardGrid

- **Opis**: responsywna siatka kart propozycji.
- **Propsy**: `proposals`, `onUpdate(id, patch)`, `onRemove(id)`.

### 4.7 FlashcardCard

- **Opis**: pojedyncza karta propozycji z przyciskami akcji.
- **Zdarzenia**: `Accept`, `Reject`, `Edit`.
- **Walidacja**: przy edycji jak wyżej.

### 4.8 EditDialog

- **Opis**: modal z formularzem edycji front/back.
- **Propsy**: `initialFront`, `initialBack`, `onSave(updated)`.

### 4.9 AcceptAllButton

- **Opis**: CTA zapisujący wszystkie pozostałe propozycje.
- **Stan**: disabled gdy lista pustych.

### 4.10 SkeletonLoader / EmptyState / Toast

- Klasyczne, wielokrotnego użycia komponenty UI z Shadcn/ui.

## 5. Typy

| Nazwa                         | Definicja                                                                | Źródło                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | -------- | ------------- | -------------- |
| `CreateGenerationCommand`     | `{ text: string; model: "gpt-4o-mini" }`                                 | globalny typ z BE                                                         |
| `GenerationCreateResponse`    | subset pól generation (id, hash, inputLength, generatedCount, createdAt) | globalny                                                                  |
| `FlashcardProposal`           | `{ id: string; front: string; back: string; state: "pending"             | "accepted"                                                                | "edited" | "rejected" }` | frontend local |
| `BulkCreateFlashcardsCommand` | `{ generationId: string\|null; flashcards: { front; back; source }[] }`  | globalny                                                                  |
| `GenerateViewState`           | `{ step: 1                                                               | 2; text: string; proposals: FlashcardProposal[]; generationId?: string }` | frontend |

## 6. Zarządzanie stanem

- **useGenerateState** (custom hook; wrapper na `useReducer`): przechowuje `GenerateViewState`, udostępnia akcje: `setText`, `setStep`, `setProposals`, `updateProposal`, `removeProposal`, `reset`.
- **useCharacterCounter**: zwraca liczbę znaków i informację o przekroczeniu limitu.
- **Context**: brak – lokalny stan wystarczy, `GeneratePage` przekazuje propsy w dół.

## 7. Integracja API

| Akcja                | Endpoint                    | Typ żądania                   | Typ odpowiedzi                                                 | Obsługa UI                                           |
| -------------------- | --------------------------- | ----------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| Generuj propozycje   | `POST /api/generations`     | `CreateGenerationCommand`     | `GenerationCreateResponse` + `FlashcardProposal[]` (mock w BE) | Pokazuje skeleton, przechodzi do kroku 2 po sukcesie |
| Zapisz zaakceptowane | `POST /api/flashcards/bulk` | `BulkCreateFlashcardsCommand` | `{ created: number; ids: string[] }`                           | Toast sukcesu + redirect `/`                         |

> Uwaga: backend zwraca na razie mock propozycji; w przyszłości będzie osobny endpoint `/api/generations/:id/proposals`.

## 8. Interakcje użytkownika

| Interakcja                          | Wynik                                                          |
| ----------------------------------- | -------------------------------------------------------------- |
| Wklejenie tekstu <1 000 lub >10 000 | Blokada przycisku „Dalej” + czerwony komunikat                 |
| „Dalej” przy poprawnym tekście      | Wywołanie API, skeleton, krok 2                                |
| Accept kart                         | karta znika z listy (lokalnie dodawana do tablicy `accepted`)  |
| Edit kart                           | otwarcie `EditDialog`, walidacja pól, zmiana stanu na `edited` |
| Reject kart                         | karta znika (stan `rejected`, filtrowana)                      |
| Accept all                          | POST bulk, toast, redirect `/`                                 |
| Back                                | powrót do kroku 1 z zachowaniem tekstu                         |

## 9. Warunki i walidacja

- **Textarea**: 1 000 ≤ `length` ≤ 10 000.
- **EditDialog**: `front` 1–200 znaków, `back` 1–500.
- **AcceptAllButton**: disabled, gdy brak kart w stanie `pending` lub `edited`.

## 10. Obsługa błędów

| Scenariusz                           | Reakcja UI                                      |
| ------------------------------------ | ----------------------------------------------- |
| 400 z `/api/generations` (walidacja) | Toast błędu z `details`, pozostanie w kroku 1   |
| 500 z `/api/generations`             | Toast „Wystąpił błąd, spróbuj ponownie później” |
| 401 (po MVP)                         | Redirect do `/login`                            |
| 400/404 z `flashcards/bulk`          | Toast i pozostanie na kroku 2                   |
| Timeout sieci                        | Toast + możliwość ponownej próby                |

## 11. Kroki implementacji

1. Utwórz routing `/generate` w `src/pages/generate.astro`; podłącz `GeneratePage` jako komponent React (`client:load`).
2. Zaimplementuj `GeneratePage.tsx` z `useGenerateState` i logiką kroków.
3. Stwórz `Step1Input` z walidacją i licznikem znaków.
4. Zaimplementuj `useCharacterCounter` i komponent `TextareaWithCounter` (Tailwind + aria).
5. Podłącz `POST /api/generations` w akcji „Dalej”; pokaż `SkeletonLoader` podczas ładowania.
6. Utwórz typ `FlashcardProposal` i zmapuj mock odpowiedzi z BE do tej struktury.
7. Zaimplementuj `Step2Proposals`, `AIFlashcardGrid`, `FlashcardCard`, `AcceptAllButton`, `EditDialog`.
8. Dodaj walidację front/back w `EditDialog` (Zod po stronie FE lub prosty regex + długość).
9. Obsłuż stany kart (pending/accepted/edited/rejected) i filtrację.
10. Integruj `POST /api/flashcards/bulk`; przygotuj payload z zaakceptowanych/edited kart i obsłuż sukces + redirect.
11. Dodaj globalny `Toast` (Shadcn/ui) na błędy i sukcesy.
12. Upewnij się, że komponenty są responsywne (grid kolumny 1→2→3) i dostępne (aria-labels, focus-trap w modalach).
13. Refaktoryzacja i lint – upewnij się, że code style zgodny z ESLint/Prettier.
