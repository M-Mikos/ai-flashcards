# API Endpoint Implementation Plan: POST /api/flashcards/bulk

## 1. Przegląd punktu końcowego

- Cel: jednorazowe zapisanie wielu fiszek (np. zaakceptowane z generacji AI) z opcjonalnym powiązaniem do istniejącej generacji.
- Rezultat: utworzenie do 50 rekordów w `flashcards`, zwrócenie ich identyfikatorów oraz liczby zapisanych.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/flashcards/bulk`
- Parametry:
  - Wymagane: `flashcards` (tablica 1–50 elementów)
  - Opcjonalne: `generationId` (uuid | null)
- Request Body (JSON, zgodny z `BulkCreateFlashcardsCommand`):
  - `generationId`: uuid | null
  - `flashcards`: Array<{
    `front`: string (1–200),
    `back`: string (1–500),
    `source`: "ai_generated" | "ai_edited" | "manual"
    }>
- Nagłówki: `Content-Type: application/json`; autoryzacja poprzez Supabase session (locals.supabase).

## 3. Wykorzystywane typy

- DTO / Command: `BulkCreateFlashcardsCommand`, `BulkCreateFlashcardsResponse`, `CreateFlashcardCommand`, `SourceEnum` z `src/types.ts`.
- Modele DB: tabela `flashcards` (kolumny: id, user_id, generation_id?, front, back, source, created_at) oraz relacja do `generations` (weryfikacja własności przy podanym generationId).

## 4. Szczegóły odpowiedzi

- Sukces 201: Body `BulkCreateFlashcardsResponse` → `{ created: number; ids: uuid[] }`.
- Błędy:
  - 400: niepoprawny JSON, walidacja schematu, przekroczenie limitu 50, puste `flashcards`.
  - 401: brak sesji użytkownika / brak supabase w locals.
  - 404: `generationId` nie istnieje lub nie należy do użytkownika.
  - 500: błąd serwera / błąd bazy / nieoczekiwany wyjątek.

## 5. Przepływ danych

1. Odbiór żądania w handlerze POST (Astro API, `prerender = false`).
2. Sprawdzenie obecności `locals.supabase`; pobranie użytkownika z `locals.supabase.auth.getUser()`.
3. Parsowanie JSON; walidacja Zod (schemat: generationId uuid|null; flashcards array length 1–50; pola front/back/source zgodne z limitami).
4. Jeśli `generationId` podane: SELECT na `generations` (where id, user_id) w celu weryfikacji własności; w razie braku → 404.
5. Przygotowanie tablicy rekordów do insertu: dodanie `user_id` z auth, `generation_id` (nullable), front/back/source.
6. Jedno zapytanie insert z `supabase.from("flashcards").insert(records).select("id")`.
7. Zwrócenie 201 z liczbą utworzonych i listą `ids`.

## 6. Względy bezpieczeństwa

- Autoryzacja: wymagane zalogowanie; użycie `locals.supabase` z kontekstu (RLS wymaga poprawnego user_id).
- RLS w Supabase zabezpiecza dane per użytkownik; wszystkie operacje muszą ustawić `user_id` zgodnie z auth.
- Walidacja wejścia Zod minimalizuje ryzyko SQL injection i nadużyć payloadu; limit 50 szt. zapobiega oversize payloadom.
- Sprawdzenie własności `generationId` chroni przed powiązaniem cudzych generacji.

## 7. Obsługa błędów

- Mapowanie kodów: 400 (walidacja/JSON), 401 (brak usera/supabase), 404 (generationId nie należy/nie istnieje), 500 (pozostałe).
- Format odpowiedzi błędu: `{ error: string, details?: ZodError.flatten() }` dla 400; pozostałe `{ error: string }`.
- Logowanie serwerowe: `console.error("bulkCreateFlashcards failed", { error })`.

## 8. Rozważania dotyczące wydajności

- Limit 50 rekordów per request zgodnie ze specyfikacją; pojedynczy insert batch zmniejsza roundtrips.
- Indeks `flashcards(generation_id)` i `(user_id, created_at desc)` wspiera typowe zapytania; brak dodatkowych indeksów wymaganych w tym etapie.
- Brak transakcji w Supabase JS – pojedynczy insert jest atomowy; jeśli potrzebna będzie atomowość z innymi operacjami, rozważyć RPC/pg function.

## 9. Etapy wdrożenia

1. Dodaj schemat Zod dla bulk create (np. w `src/lib/services/flashcards.ts` lub dedykowanym module walidacji) z limitami długości i rozmiarem tablicy 1–50.
2. Rozszerz serwis `flashcards` o funkcję `bulkCreateFlashcards({ supabase, payload })` (używa `locals.supabase`, weryfikuje generationId, wstawia batch i zwraca ids).
3. Utwórz endpoint `src/pages/api/flashcards/bulk.ts`: `prerender = false`; handler POST korzysta z nowego serwisu; mapuje błędy (404 dla braku generacji, 400 dla walidacji, 401 dla braku usera, 500 dla pozostałych).
4. Upewnij się, że eksporty typów w `src/types.ts` są użyte (BulkCreateFlashcardsCommand/Response) i zgodne z handlerem.
