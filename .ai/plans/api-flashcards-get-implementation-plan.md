# API Endpoint Implementation Plan: GET `/api/flashcards`

## 1. Przegląd punktu końcowego

Lista fiszek bieżącego użytkownika z paginacją, filtrowaniem po `source` i `generationId` oraz sortowaniem po `created_at`.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/flashcards`
- Parametry:
  - Wymagane: brak
  - Opcjonalne (query):
    - `page` (number, min 1, domyślnie 1)
    - `pageSize` (number, 1–100, domyślnie 24)
    - `source` (`ai_generated` | `ai_edited` | `manual`)
    - `sort` (`created_at desc` | `created_at asc`, domyślnie `created_at desc`)
- Request Body: brak

## 3. Wykorzystywane typy

- `FlashcardDTO`, `FlashcardListQuery`, `FlashcardListResponse` z `src/types.ts`.
- Nowy schema Zod dla query (np. `listFlashcardsSchema`) w serwisie flashcards.

## 3. Szczegóły odpowiedzi

- 200 OK: `FlashcardListResponse` → `{ items: FlashcardDTO[], page, pageSize, total }`.
- Błędy:
  - 400: nieprawidłowe parametry query (walidacja)
  - 401: brak autoryzacji/`locals.supabase` niedostępne
  - 500: nieoczekiwany błąd serwera/Supabase

## 4. Przepływ danych

1. Klient wywołuje GET z opcjonalnymi parametrami query.
2. Handler Astro pobiera `locals.supabase`; weryfikuje dostępność i (jeśli wymagane) session/userId.
3. Parsowanie `URLSearchParams`, walidacja Zod, ustawienie domyślnych wartości.
4. Serwis `listFlashcards`:
   - `from("flashcards").select(...)` z `eq("user_id", userId)`.
   - Opcjonalne `eq("source", source)`.
   - Sort przez `order("created_at", { ascending })` zależnie od `sort`.
   - Paginacja: `range(offset, offset + pageSize - 1)`; `offset = (page-1)*pageSize`.
   - Pobranie `count: "exact"` dla `total`.
   - Mapowanie wierszy na `FlashcardDTO` (camelCase).
5. Handler zwraca JSON z 200 oraz `FlashcardListResponse`.

## 5. Względy bezpieczeństwa

- Używaj `locals.supabase`; nie importuj klienta globalnie.
- Polegaj na RLS na `flashcards`; dodatkowo filtr `user_id`.
- Waliduj i ogranicz parametry (pageSize ≤ 100) by uniknąć nadużyć.
- Nie ujawniaj danych innych użytkowników; puste wyniki dla niedopasowanych filtrów.

## 6. Obsługa błędów

- 400: `safeParse` nie powiodło się → `{ error: "Validation error", details }`.
- 401: brak `locals.supabase`/session → `{ error: "Unauthorized" }`.
- 500: inne wyjątki/Supabase → log `console.error("listFlashcards failed", { error })`, odpowiedź `{ error: "Internal Server Error" }`.
- 404: nie używać dla listy; brak danych = 200 z `items: []`.

## 7. Rozważania dotyczące wydajności

- Limit `pageSize` do 100, domyślnie 24.
- Indeks `(user_id, created_at desc)` wspiera sortowanie/paginację.
- Wybieraj tylko potrzebne kolumny w `select`.
- `count: "exact"` może być kosztowne; akceptowalne na start, ewentualnie przełączyć na `planned` później.

## 8. Etapy wdrożenia

1. Dodaj Zod `listFlashcardsSchema` w `src/lib/services/flashcards.ts` (domyślne wartości, limity, enumy, uuid).
2. Dodaj funkcję `listFlashcards({ supabase, query, userId })` w serwisie:
   - walidacja schematem,
   - budowa zapytania z filtrami, sort, paginacją, `count: "exact"`,
   - mapowanie na `FlashcardDTO` i zwrot `FlashcardListResponse`.
3. Eksportuj nowe typy/wynik z serwisu (jeśli potrzebne).
4. Rozszerz `src/pages/api/flashcards.ts` o handler GET:
   - pobierz `locals.supabase`, w razie braku → 500 lub 401 (spójnie z POST),
   - zbuduj obiekt query z `request.url`, waliduj schematem,
   - wywołaj `listFlashcards`,
   - zwróć 200 z JSON; 400 przy walidacji; 401 przy braku auth; 500 w pozostałych przypadkach (log błędu).
5. Utrzymaj `export const prerender = false`.
