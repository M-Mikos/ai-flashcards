# Plan implementacji widoku „Moje fiszki”

## 1. Przegląd
Widok „Moje fiszki” służy do przeglądu, filtrowania oraz zarządzania zapisanymi fiszkami użytkownika (front, data utworzenia, źródło). Zapewnia akcje dodawania, edycji i usuwania fiszek oraz nawigację do generowania nowych fiszek.

## 2. Routing widoku
- Ścieżka: `/`
- Dostępny jako główny widok listy fiszek.

## 3. Struktura komponentów
- `Layout/MainShell` (navbar + bottom nav)
  - `TopBar` (tytuł, przyciski akcji „Generuj”, „Utwórz”)
  - `FiltersBar` (FilterSelect source, SortSelect)
  - `ProgressIndicator` (licznik postępu scrolla / infinite trigger)
  - `InfiniteFlashcardGrid`
    - `FlashcardCard` (front, createdAt, source, actions Edit/Delete)
    - `FlashcardSkeleton` (dla ładowania)
  - `AddFlashcardDialog` (formularz front/back/source)
  - `EditFlashcardDialog` (formularz front/back/source)
  - `DeleteFlashcardDialog` (potwierdzenie)
  - `ToastHost`

## 4. Szczegóły komponentów
### Layout/MainShell
- Opis: oprawa widoku, ustawia siatkę, marginy, navbar/bottom nav.
- Elementy: `header`, `main`, `footer`, `Navbar`, `BottomNav`.
- Interakcje: brak własnych; przekazuje callbacki.
- Walidacja: n/d.
- Typy: layout props `{ children: ReactNode }`.
- Propsy: dzieci.

### TopBar
- Opis: nagłówek strony z tytułem i szybkimi akcjami.
- Elementy: tytuł, `Button` „Generuj”, `Button` „Utwórz”.
- Interakcje: onGenerate (nawigacja do `/generate`), onCreate (otwarcie dialogu).
- Walidacja: n/d.
- Typy: `{ onGenerate: () => void; onCreate: () => void; }`.
- Propsy: jw.

### FiltersBar
- Opis: kontrolki filtrowania i sortowania listy.
- Elementy: `Select source`, `Select sort`.
- Interakcje: onSourceChange, onSortChange.
- Walidacja: wartości `source` zgodne z `SourceEnum`; `sort` ∈ `created_at desc|asc`.
- Typy: `{ source?: SourceEnum; sort: SortOption; onSourceChange(value?: SourceEnum): void; onSortChange(value: SortOption): void; }`.
- Propsy: jw.

### ProgressIndicator
- Opis: pokazuje postęp scrolla/infinite trigger (np. % lub loader).
- Elementy: pasek/tekst, ewentualnie spinner gdy ładuje kolejną stronę.
- Interakcje: reaguje na stan listy (loading/hasMore).
- Walidacja: n/d.
- Typy: `{ progress: number; isLoading: boolean; }`.
- Propsy: jw.

### InfiniteFlashcardGrid
- Opis: renderuje siatkę kart z infinite scroll (80% trigger).
- Elementy: kontener grid, listę `FlashcardCard`, `FlashcardSkeleton` podczas ładowania.
- Interakcje: onEdit(id), onDelete(id), infinite-load trigger onScrollNearEnd.
- Walidacja: dane kart zgodne z DTO; blokada podwójnego fetchu przy loading.
- Typy: `{ items: FlashcardViewModel[]; isLoading: boolean; hasMore: boolean; onLoadMore(): void; onEdit(item: FlashcardViewModel): void; onDelete(item: FlashcardViewModel): void; }`.
- Propsy: jw.

### FlashcardCard
- Opis: pojedyncza karta fiszki z akcjami.
- Elementy: front (ellipsis 3 linie), createdAt (data), source tag, przyciski Edit/Delete.
- Interakcje: onEdit(id), onDelete(id).
- Walidacja: brak; prezentacja gotowych danych.
- Typy: `{ item: FlashcardViewModel; onEdit(item): void; onDelete(item): void; }`.
- Propsy: jw.

### FlashcardSkeleton
- Opis: placeholder podczas ładowania.
- Elementy: bloczki shimmer.
- Interakcje: brak.
- Walidacja: n/d.
- Typy: none.
- Propsy: none.

### AddFlashcardDialog
- Opis: modal do tworzenia fiszki.
- Elementy: form `front` textarea (max 200), `back` textarea (max 500), `source` select (manual default), submit/cancel.
- Interakcje: submit -> POST `/api/flashcards`; onSuccess -> toast + refetch/prepend; cancel -> zamknięcie.
- Walidacja: front 1–200, back 1–500, source ∈ enum; blokada submit przy błędach; obsługa błędów API.
- Typy: `{ isOpen: boolean; onClose(): void; onCreated(item: FlashcardViewModel): void; }`.
- Propsy: jw.

### EditFlashcardDialog
- Opis: modal do edycji istniejącej fiszki.
- Elementy: form `front`, `back`, `source`; wstępne wartości; submit/cancel.
- Interakcje: submit -> PATCH `/api/flashcards/:id`; onSuccess -> toast + lokalny update; cancel -> zamknięcie.
- Walidacja: front/back jak wyżej; source zgodne z enum; `id` UUID.
- Typy: `{ item: FlashcardViewModel | null; isOpen: boolean; onClose(): void; onUpdated(item: FlashcardViewModel): void; }`.
- Propsy: jw.

### DeleteFlashcardDialog
- Opis: potwierdzenie usunięcia.
- Elementy: tekst potwierdzenia, przyciski confirm/cancel.
- Interakcje: confirm -> DELETE `/api/flashcards/:id`; onSuccess -> toast + remove; cancel -> zamknięcie.
- Walidacja: `id` UUID; blokada gdy request w toku.
- Typy: `{ item: FlashcardViewModel | null; isOpen: boolean; onClose(): void; onDeleted(id: string): void; }`.
- Propsy: jw.

### ToastHost
- Opis: kontener na komunikaty sukces/błąd.
- Elementy: toasty.
- Interakcje: wywoływane przez akcje CRUD.
- Walidacja: n/d.
- Typy: zależnie od biblioteki (np. shadcn toast).
- Propsy: n/d (global provider).

## 5. Typy
- `FlashcardDTO` z `src/types.ts` (id, front, back, source, generationId, createdAt, updatedAt).
- `SourceEnum` z `src/types.ts`.
- `FlashcardListResponse` (`items`, `page`, `pageSize`, `total`).
- `CreateFlashcardCommand` (front, back, source, generationId?).
- `UpdateFlashcardCommand` (partial front/back/source).
- `FlashcardViewModel` (nowy): `{ id: string; front: string; back: string; source: SourceEnum; generationId: string | null; createdAt: string; updatedAt: string; createdLabel: string; }` gdzie `createdLabel` to sformatowana data dla UI.
- `SortOption` (union `"created_at desc" | "created_at asc"`).
- `FlashcardListQueryVM`: `{ page: number; pageSize: number; source?: SourceEnum; sort: SortOption; }`.

## 6. Zarządzanie stanem
- Lokalny stan w komponencie widoku (React useState/useEffect).
- `useFlashcardsList` (custom hook): trzyma `items`, `page`, `pageSize`, `total`, `isLoading`, `hasMore`, `source`, `sort`; metody `loadInitial`, `loadMore`, `applySource`, `applySort`, `prepend`, `updateOne`, `removeOne`. Implementuje blokadę równoległych fetchy i reset listy przy zmianie filtrów.
- Stany modali: `isAddOpen`, `editingItem`, `deletingItem`.
- Stan progress: procent scrolla / near-end trigger.

## 7. Integracja API
- GET `/api/flashcards` z query: `page`, `pageSize`, `source`, `sort`. Odpowiedź: `FlashcardListResponse`.
- POST `/api/flashcards` body `CreateFlashcardCommand`. Odpowiedź: `FlashcardCreateResponse` (mapuj do `FlashcardViewModel`).
- PATCH `/api/flashcards/:id` body `UpdateFlashcardCommand`. Odpowiedź: `FlashcardUpdateResponse` -> mapuj do VM.
- DELETE `/api/flashcards/:id` brak body, status 204.
- Weryfikacja: front 1–200, back 1–500, source ∈ enum; id UUID; obsługa 400/404/500.

## 8. Interakcje użytkownika
- Klik „Generuj” → nawigacja do `/generate`.
- Klik „Utwórz” → otwiera `AddFlashcardDialog`.
- Zmiana filtrowania/sortowania → reset listy, fetch od strony 1.
- Scroll do 80% → `onLoadMore` jeśli `hasMore && !isLoading`.
- Klik „Edit” na karcie → otwiera `EditFlashcardDialog` z danymi.
- Klik „Delete” → `DeleteFlashcardDialog` potwierdzenie.
- Submit formularza add/edit → walidacja klienta; sukces -> toast + update listy; błąd -> toast/error inline.
- Confirm delete → żądanie DELETE, sukces -> usunięcie z listy + toast.

## 9. Warunki i walidacja
- Formularze: `front` required, 1–200; `back` required, 1–500; `source` required (`ai_generated` | `ai_edited` | `manual`); opcjonalny `generationId` (UUID/null) ustawiany tylko przy AI.
- Query params: `page>=1`, `pageSize 1–100`, `sort` w dozwolonym zbiorze, `source` w enum.
- UUID walidowany przed wywołaniem PATCH/DELETE (opcjonalnie klient lub zaufanie backendowi – preferencja: prosta regex/length check).
- Blokada podwójnych żądań przy ładowaniu/infinite scroll.
- Wyrównana wysokość kart, ellipsis 3 linie front.

## 10. Obsługa błędów
- 400 walidacja: pokazanie inline w formularzu (front/back/source) lub toast „Nieprawidłowe dane”.
- 404 przy PATCH/DELETE: toast „Fiszka nie istnieje” i odświeżenie listy.
- 500/other: toast „Wystąpił błąd, spróbuj ponownie”.
- Brak danych / pusta lista: stan pusty z CTA „Utwórz” / „Generuj”.
- Timeout/infinite scroll: pokaż retry button w ProgressIndicator gdy `hasMore` i błąd.

## 11. Kroki implementacji
1. Utwórz typy pomocnicze (`FlashcardViewModel`, `SortOption`, `FlashcardListQueryVM`) w dedykowanym pliku np. `src/lib/view-models/flashcards.ts`.
2. Zaimplementuj hook `useFlashcardsList` (fetch, mapowanie DTO->VM, paginacja, filtry, loading/error states).
3. Zbuduj komponenty UI: `TopBar`, `FiltersBar`, `ProgressIndicator`, `FlashcardCard`, `FlashcardSkeleton`, `InfiniteFlashcardGrid`, dialogi Add/Edit/Delete; wykorzystaj shadcn/ui + Tailwind.
4. W widoku `/` złoż komponenty w `Layout/MainShell`, podłącz hook, zdarzenia i toasty.
5. Dodaj walidację formularzy (front/back length, source enum) i obsługę błędów API.
6. Dodaj stany pusty/loading/infinite scroll oraz trigger 80% scrolla.
7. Przetestuj ręcznie: lista, filtry, sort, paginacja, add/edit/delete, błędy 400/404/500, stany pusty i retry.

