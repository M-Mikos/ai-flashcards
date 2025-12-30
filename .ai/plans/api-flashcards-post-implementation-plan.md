# API Endpoint Implementation Plan: POST /api/flashcards

## 1. Przegląd punktu końcowego

Punkt końcowy tworzy pojedynczą fiszkę (manualną lub pochodzącą z AI) dla zalogowanego użytkownika. Obsługuje opcjonalne powiązanie z sesją generacji (generations) i wymusza ograniczenia długości oraz dozwolone źródła.

Ważne! na ten moment projekt nie będzie posiadał uwieżytelniania ani autoryzacji. Wszystkie żądania mają być wykonywane jako testowy użytkownik (jeśli to konieczne), korzystaj z ID zapisanym w pliku `src/db/supabase.client.ts` pod importuj wartość `TEST_USER_ID`.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/flashcards`
- Parametry:
  - Wymagane (body): `front` (1–200), `back` (1–500), `source` ∈ {`ai_generated`, `ai_edited`, `manual`}
  - Opcjonalne (body): `generationId` (UUID lub null)
- Request Body: JSON zgodny z `CreateFlashcardCommand` (`front`, `back`, `source`, `generationId`)
- Nagłówki: `Authorization: Bearer <supabase access token>`

## 3. Wykorzystywane typy

- DTO/Command z `src/types.ts`:
  - `CreateFlashcardCommand`
  - `FlashcardCreateResponse`
  - `SourceEnum`
- DB: tabela `flashcards` (kolumny: `id`, `user_id`, `generation_id`, `front`, `back`, `source`, `created_at`, `updated_at`), FK do `generations.id`

## 3. Szczegóły odpowiedzi

- 201 Created, body: `FlashcardCreateResponse` (`id`, `front`, `back`, `source`, `generationId`, `createdAt`)
- Nagłówki: `Content-Type: application/json`

## 4. Przepływ danych

1. Wejście: żądanie HTTP POST z JSON.
2. Middleware/Auth: pobranie `supabase` z `context.locals` i weryfikacja `auth.getUser()`.
3. Walidacja: Zod schema (front/back length, source enum, generationId UUID/null).
4. Jeżeli `generationId` podane:
   - SELECT z `generations` ograniczone do `user_id` = auth.uid() (RLS + jawny check).
   - 404 gdy brak/nie należy.
5. INSERT do `flashcards` z `user_id` = auth.uid(), `generation_id` (null lub podane), polami front/back/source.
6. Mapowanie rekordu do `FlashcardCreateResponse` (camelCase).
7. Zwrot 201 z JSON.

## 5. Względy bezpieczeństwa

- Autoryzacja: wymagany ważny token Supabase; używać `supabase` z `context.locals`.
- RLS w DB dodatkowo egzekwuje własność użytkownika.
- Walidacja wejścia Zod (uniknięcie SQL injection i nadmiernych payloadów).
- Brak ujawniania `user_id` w odpowiedzi.

## 6. Obsługa błędów

- 400: walidacja Zod, niepoprawne UUID, długości pól, niedozwolone `source`.
- 401: brak/mis tokena lub `getUser()` zwraca błąd/brak usera.
- 404: `generationId` nie istnieje lub nie należy do użytkownika.
- 500: niespodziewane błędy bazy lub serwera.
- Logowanie: w handlerze logować strukturalnie (console/error logger) z kontekstem requestu; brak dedykowanej tabeli logów — ewentualne przyszłe rozszerzenie.

## 7. Rozważania dotyczące wydajności

- Pojedynczy INSERT — niskie obciążenie.
- Zapytanie weryfikujące `generationId` indeksowane (`generation_id`, `user_id` via RLS + PK/idx).
- Upewnić się, że walidacja Zod wykonuje się przed I/O.

## 8. Etapy wdrożenia

1. Dodaj Zod schema do `CreateFlashcardCommand` (front/back/source/generationId nullable UUID).
2. Utwórz/uzupełnij service w `src/lib/services/flashcards.ts` z metodą `createFlashcard({ supabase, userId, payload })` wykonującą:
   - opcjonalny check `generationId` (select ograniczony userem),
   - insert do `flashcards`,
   - mapowanie do `FlashcardCreateResponse`.
3. Utwórz endpoint `src/pages/api/flashcards.ts`:
   - `export const prerender = false;`
   - handler `POST`:
     - pobierz `supabase` z `context.locals`;
     - `auth.getUser()` -> 401 gdy brak/błąd;
     - parse + walidacja body (Zod) -> 400;
     - wywołaj service; jeśli 404 z service -> propagate; inne błędy -> 500;
     - zwróć 201 i JSON.
4. Dodaj mapery/utility do konwersji snake_case→camelCase jeśli brak (lub inline w service).
