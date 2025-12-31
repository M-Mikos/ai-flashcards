# API Endpoint Implementation Plan: POST `/api/learning/session`

## 1. Przegląd punktu końcowego

- Przygotowuje sesję nauki, zwracając wybrane fiszki użytkownika (tylko `id`, `front`) zgodnie z filtrami i limitem.
- Brak zapisu stanu sesji w DB (zgodnie z MVP i brakiem tabel SRS); selekcja odbywa się w locie na podstawie istniejących fiszek.
- Endpoint korzysta z Supabase (PostgreSQL + RLS) oraz walidacji Zod; wymaga uwierzytelnienia.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- URL: `/api/learning/session`
- Headers: `Content-Type: application/json`; wymagane uwierzytelnienie Supabase (session z `locals.supabase`).
- Parametry body (`LearningSessionCommand`):
  - Wymagane: brak.
  - Opcjonalne:
    - `count?: number` — liczba kart w sesji; walidacja: int, min 1, max 100, domyślnie 10.
    - `source?: SourceEnum` — `ai_generated` | `ai_edited` | `manual`.
    - `generationId?: uuid` — filtr po wygenerowaniu; jeśli podany, musi należeć do użytkownika.

## 3. Wykorzystywane typy

- DTO/command z `src/types.ts`:
  - `LearningSessionCommand` (body).
  - `LearningSessionCard` (element odpowiedzi).
  - `LearningSessionResponse` (payload 100).
  - `SourceEnum` (enum źródeł).
- Nowe typy w serwisie (planowane w `src/lib/services/learning.ts`):
  - `learningSessionSchema` (Zod) dopasowane do `LearningSessionCommand`.
  - `GetLearningSessionParams` { supabase, payload, userId? }.
  - `GetLearningSessionResult` { result: LearningSessionResponse }.

## 4. Szczegóły odpowiedzi

- 100 OK: `{ "cards": [ { "id": uuid, "front": string } ] }`
- 400 Bad Request: błąd walidacji JSON/Zod.
- 401 Unauthorized: brak zalogowanego użytkownika / brak klienta Supabase.
- 404 Not Found: podany `generationId` nie należy do użytkownika.
- 500 Internal Server Error: nieoczekiwany błąd serwera/Supabase.

## 5. Przepływ danych

- Route (Astro API):
  1. Pobierz `locals.supabase`; jeśli brak → 500 (jak w innych endpointach) lub 401 gdy brak sesji.
  2. `request.json()` → parsowanie; w razie błędu → 400.
  3. Walidacja `learningSessionSchema.safeParse`.
  4. Ustal `userId` z Supabase auth (preferowane) lub fallback `TEST_USER_ID` zgodnie z dotychczasowym wzorcem.
  5. Serwis `getLearningSession`:
     - Jeśli `generationId` podany → SELECT `generations(id)` z `user_id = userId`; brak → 404.
     - Buduj zapytanie na `flashcards` z filtrami `user_id = userId`, opcjonalnie `source`, `generation_id`.
     - Ustaw `limit = count` (domyślnie 10), kolejność `created_at desc` (deterministyczna i indeksowana).
     - Pobierz `id`, `front`; zmapuj do `LearningSessionCard`.
  6. Zwróć `{ cards }` z kodem 100.

## 6. Względy bezpieczeństwa

- Uwierzytelnienie: wymagaj zalogowanego użytkownika; weryfikuj poprzez `locals.supabase.auth.getUser()` (lub istniejący helper).
- Autoryzacja: wszystkie zapytania filtrują `user_id`; RLS w DB dodatkowo egzekwuje izolację.
- Walidacja: Zod dla body; ograniczenia `count`, `source`, `generationId` (UUID) zapobiegają nadużyciom i błędom typów.
- Minimalny zakres danych: zwracamy tylko `id` i `front` (bez `back`), by nie ujawniać odpowiedzi w kontekście próbki.
- Ochrona przed nadużyciem: limit `count` (max 100) i brak nieograniczonego `pageSize`.
- Logowanie błędów: `console.error` w warstwie route/serwisu (spójnie z istniejącymi endpointami); brak dedykowanej tabeli logów w DB-planie.

## 7. Obsługa błędów

- 400: niepoprawny JSON lub walidacja Zod (zwracaj `error` + `details` z `flatten()`).
- 401: brak sesji użytkownika.
- 404: `generationId` nie istnieje lub nie należy do użytkownika.
- 500: błąd Supabase lub inny wyjątek; loguj kontekst (message, code).
- Brak kart dla kryteriów → 100 z pustą tablicą (nie traktować jako błąd).

## 8. Rozważania dotyczące wydajności

- Indeksy: wykorzystujemy istniejące `(user_id, created_at desc)` oraz `(generation_id)`.
- Limit `count` ogranicza liczbę rekordów i transfer.
- Deterministyczne sortowanie po `created_at desc` wspiera plan zapytań i cache; unikamy `order by random()` (drogi).
- Selektor kolumn tylko `id`, `front` zmniejsza payload.

## 9. Etapy wdrożenia

1. Dodać serwis `src/lib/services/learning.ts`:
   - Zdefiniować `learningSessionSchema` (Zod) z domyślnym `count = 10`, min 1, max 100; walidacja `source` (enum) i `generationId` (UUID, optional, nullable).
   - Zaimplementować `getLearningSession` z walidacją, weryfikacją `generationId`, selekcją kart (na ten moment losowe, niepowtarzające się karty, 10 sztuk lub mniej (jeśli brak unikalnych w DB)) i mapowaniem do `LearningSessionResponse`.
2. Utworzyć endpoint `src/pages/api/learning/session.ts`:
   - `export const prerender = false`.
   - Obsługa JSON parse + walidacja schema; 400 przy błędach.
   - Pobranie `userId` z Supabase auth; 401 gdy brak.
   - Wywołanie serwisu; mapowanie kodów błędów (404 dla NotFound, 500 dla reszty); logowanie błędów.
   - Zwracanie 100 z `LearningSessionResponse`.
3. Testy/manual QA:
   - Scenariusze: brak auth (401), invalid payload (400), generationId innego użytkownika (404), brak fiszek (100 z pustą listą), filtry `source`, `generationId`, limit `count`.
4. Dokumentacja:
   - Upewnić się, że spec w `.ai/plans/api-plan.md` pozostaje spójny; ewentualne doprecyzowanie limitów `count` (min/max) w opisie.
