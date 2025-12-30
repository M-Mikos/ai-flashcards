# API Endpoint Implementation Plan: GET/PATCH/DELETE `/api/flashcards/:id`

## 1. Przegląd punktu końcowego

- Umożliwia pobranie, częściową aktualizację oraz usunięcie pojedynczej fiszki należącej do zalogowanego użytkownika.
- Operuje na tabeli `flashcards` (powiązanej z `generations` oraz `auth.users` z RLS).

## 2. Szczegóły żądania

- Metody HTTP: `GET`, `PATCH`, `DELETE`
- Struktura URL: `/api/flashcards/:id` (`:id` jako UUID)
- Parametry:
  - Wymagane (path): `id` – UUID istniejącej fiszki
  - Brak parametrów query
- Request Body:
  - `GET` / `DELETE`: brak
  - `PATCH`: częściowe pole `front?`, `back?`, `source?` zgodnie z `UpdateFlashcardCommand`
    - `front`: string (max 200)
    - `back`: string (max 500)
    - `source`: enum `source_enum` (`ai_generated` | `ai_edited` | `manual`)

## 3. Wykorzystywane typy

- DTO: `FlashcardDTO` (camelCase, bez `userId`)
- Command:
  - `UpdateFlashcardCommand` (Partial `front | back | source`)
- DB row: `Tables<"flashcards">` dla walidacji typów
- Enum: `SourceEnum` (Supabase `source_enum`)

## 3. Szczegóły odpowiedzi

- `GET 200`: `FlashcardDTO`
- `PATCH 200`: zaktualizowany `FlashcardDTO` (źródło aktualne po logice `ai_edited`)
- `DELETE 204`: brak body
- Błędy:
  - `400`: nieprawidłowy UUID lub walidacja body
  - `401`: brak/niepoprawna sesja
  - `404`: fiszka nie istnieje lub nie należy do użytkownika
  - `500`: błąd serwera/Supabase

## 4. Przepływ danych

1. Middleware/autoryzacja: pobranie supabase z `context.locals` i walidacja sesji (RLS dodatkowo wymusza właściciela).
2. Walidacja path param `id` (UUID) oraz – dla `PATCH` – body Zod.
3. Serwis `flashcards` (istniejący w `src/lib/services/flashcards.ts`):
   - `GET`: pobiera wiersz z `flashcards` filtrem `id` + `user_id`.
   - `PATCH`: aktualizuje dozwolone pola; jeśli zmieniono `front` lub `back` i poprzednie `source` = `ai_generated`, ustaw `source` na `ai_edited` (chyba że body dostarcza `manual` explicite).
   - `DELETE`: usuwa wiersz (filter `id` + `user_id`).
4. Mapowanie wyniku na `FlashcardDTO` (camelCase) przed zwróceniem.

## 5. Względy bezpieczeństwa

- Walidacja wejścia Zod (UUID, długości, enum).
- Brak logowania treści fiszek w logach błędów (ochrona danych użytkownika).
- Odpowiedzi bez danych `userId`.

## 6. Obsługa błędów

- Walidacja:
  - Path `id` nie-UUID → `400`.
  - Body `PATCH` puste lub pola przekraczające limity → `400`.
- Biznesowe:
  - Rekord nie istnieje / nie właściciel → `404`.
- Serwis/Supabase:
  - Błąd zapytania → log (bez wrażliwych danych), odpowiedź `500`.
- Autoryzacja: brak sesji → `401`.

## 7. Rozważania dotyczące wydajności

- Indeks `flashcards(user_id, created_at)` oraz PK `id` zapewniają szybkie look-upy.
- Operacje dotyczą pojedynczego rekordu – brak konieczności paginacji ani limit/offset.
- Minimalizować liczbę round-tripów: `PATCH` może użyć pojedynczego `update ... returning *`.

## 8. Etapy wdrożenia

1. Utwórz/uzupełnij plik routingu Astro `src/pages/api/flashcards/[id].ts` (lub równoważny) z `export const prerender = false`.
2. Dodaj Zod schematy: `idParamSchema` (UUID), `updateFlashcardSchema` (partial, długości front/back, enum source, co najmniej jedno pole).
3. Wstrzykuj `supabase` z `context.locals`; pobierz sesję (np. `supabase.auth.getUser()`) i zwróć `401` przy braku użytkownika.
4. `GET`: waliduj `id`, wywołaj serwis `getFlashcardById(userId, id)`, mapuj do `FlashcardDTO`, zwróć `200` lub `404`.
5. `PATCH`: waliduj `id` i body; pobierz istniejący rekord; oblicz nowy `source` (jeśli zmiana front/back i stary `source` == `ai_generated` → `ai_edited`, chyba że przekazano `manual`); wykonaj update z filtrem `user_id`; zwróć `200` lub `404`.
6. `DELETE`: waliduj `id`; usuń rekord z filtrem `user_id`; na brak rekordu zwróć `404`, w sukcesie `204`.
7. Obsługa błędów: opakuj w try/catch; loguj błąd (bez treści fiszek), zwracaj `500`.
