# API Endpoint Implementation Plan: POST `/api/generations`

## 1. Przegląd punktu końcowego

Tworzy sesję generowania fiszek z przekazanego tekstu (1000–10000 znaków) przy użyciu modelu `gpt-4o-mini`. Zapisuje metadane generacji (hash wejścia, czasy, liczby wygenerowanych/zaakceptowanych kart) i zwraca skrócone dane nowej generacji. Wymaga uwierzytelnionego użytkownika (Supabase Auth, RLS).

Ważne! na ten moment projekt nie będzie posiadał uwieżytelniania ani autoryzacji. Wszystkie żądania mają być wykonywane jako testowy użytkownik (jeśli to konieczne), korzystaj z ID zapisanym w pliku `src/db/supabase.client.ts` pod importuj wartość `TEST_USER_ID`.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/generations`
- Parametry:
  - Wymagane (body): `text` (string, 1000–10000), `model` (literal `"gpt-4o-mini"`)
  - Opcjonalne: brak parametrów query/path
- Request Body: JSON zgodny z `CreateGenerationCommand`

## 3. Wykorzystywane typy

- Wejście: `CreateGenerationCommand` (`text`, `model: "gpt-4o-mini"`)
- DTO: `GenerationDTO` (pełne dane generacji)
- Odpowiedź: `GenerationCreateResponse` (`id`, `hash`, `inputLength`, `generatedCount`, `createdAt`)
- Typy DB: `Tables<"generations">`, `Enums<"source_enum">` (z `src/db/database.types.ts`)

## 4. Szczegóły odpowiedzi

- Statusy:
  - 201 Created: body `GenerationCreateResponse`
  - 400 Bad Request: walidacja (długość tekstu/model)
  - 401 Unauthorized: brak/niepoprawny token
  - 500 Internal Server Error: błędy serwera/AI
- Nagłówki: `Content-Type: application/json`

## 5. Przepływ danych

1. Middleware uwierzytelnia i umieszcza `supabase` w `locals`.
2. Handler POST `/api/generations`:
   - Parsuje i waliduje body (Zod w handlerze lub serwisie).
   - Oblicza `input_length` (znaki) i `hash` (np. sha256 tekstu; brak wymogu unikalności).
   - Wywołuje usługę AI (placeholder lub realne) do generacji propozycji kart; mierzy czas (`generation_time_ms`), zlicza `generated_count`.
   - Wstawia rekord do tabeli `generations` z polami: `user_id`, `hash`, `input_length`, `generation_time_ms`, `generated_count`, `accepted_count=0`, `accepted_edited_count=0`, `model_name`.
3. Zwraca dane zgodne z `GenerationCreateResponse`.

## 6. Względy bezpieczeństwa

- Autoryzacja: RLS w Supabase; każda operacja na `generations` scoped po `auth.uid()`.
- Uwierzytelnienie: wymagany token Supabase; użyć `supabase` z `locals`, nie importować klienta globalnie.
- Walidacja wejścia: Zod limituje długości; odrzucenie nadmiernie długich payloadów (opcjonalnie limit body).
- Brak logowania wrażliwego tekstu wejściowego; jeśli logi, to skrót/hash lub długość.
- Hash nie jest unikalny; nie eksponować danych innych użytkowników.

## 7. Obsługa błędów

- 400: tekst <1000 lub >10000, pusty model, model ≠ `"gpt-4o-mini"`, nieparsowalne JSON.
- 401: brak/nieprawidłowy token Supabase.
- 500: wyjątki serwerowe, błąd AI provider; logować z kontekstem (userId, length, model) bez pełnego tekstu.
- Mapowanie: użyć jednolitego helpera błędów (jeśli istnieje); inaczej proste `return new Response(JSON.stringify({ error: "..."}), { status })`.

## 8. Rozważania dotyczące wydajności

- Limit payloadu (np. 12–16 KB) i wczesne odrzucenie przed pracą AI/DB.
- Użycie strumieniowej lektury body niekonieczne (małe payloady).
- Hashowanie tekstu lokalnie; unikać wielokrotnych obliczeń.
- Mierzyć czas generacji wokół wywołania AI; nie blokować I/O.
- Indeks `generations (user_id, created_at desc)` zapewni szybkie listowanie dalszych endpointów.

## 9. Etapy wdrożenia

1. Utwórz schemat walidacji Zod dla `CreateGenerationCommand` (tekst 1000–10000, model literal).
2. Dodaj serwis `src/lib/services/generations.ts` (jeśli brak): funkcje `createGeneration({ supabase, userId, text, model })` zwracająca `GenerationCreateResponse`. Na ten moment nie implementuj logiki biznesowej, stwórz prosty mock odpowiedzi z trzema przykładowymi fiszkami.
3. W serwisie: policz `input_length`, `hash` (sha256), zmierz `generation_time_ms` (wokół stubu/wywołania AI), ustaw `generated_count` na liczbę wygenerowanych kart (placeholder 0 lub wynik modelu), `accepted_count=0`, `accepted_edited_count=0`.
4. Wstawić rekord `generations` via supabase RPC/insert; obsłużyć błędy DB (mapa na 500).
5. Utwórz handler `src/pages/api/generations.ts` (Astro endpoint, `export const prerender = false`, `POST`): waliduj Zod, pobierz `supabase` z `locals`, `auth.getUser()`, wywołaj serwis, zwróć 201 i DTO.
6. Upewnić się, że logi nie zawierają pełnego tekstu; logować tylko długość/hash.
