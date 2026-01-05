# Plan testów dla projektu „AI Flashcards”

## 1. Wprowadzenie i cele testowania

Celem procesu testowego jest potwierdzenie, że aplikacja „AI Flashcards” – zbudowana w technologii Astro 5 + React 19 z backendem Supabase i integracją z OpenRouter AI – spełnia wymagania funkcjonalne, niefunkcjonalne oraz jakościowe. Testowanie ma zminimalizować ryzyka biznesowe i technologiczne poprzez wczesne wykrywanie defektów oraz dostarczenie mierzalnych danych o poziomie jakości produktu.

## 2. Zakres testów

1. Frontend  
   • Komponenty React (UI, hooki)  
   • Strony Astro (routing, SSR/CSR, middleware)
2. Backend (API endpoints `/api/*`)  
   • Autoryzacja i uwierzytelnianie (Supabase)  
   • Operacje na fiszkach, generacjach, sesjach nauki
3. Integracje zewnętrzne  
   • Supabase (baza, auth)  
   • OpenRouter AI (LLM)
4. Użyteczność, dostępność i responsywność UI
5. Wydajność krytycznych ścieżek (czas odpowiedzi API, TTI/TBT frontu)
6. Bezpieczeństwo podstawowe (kontrola dostępu, walidacja danych)

## 3. Typy testów

| Typ testu                | Poziom                                     | Narzędzia                       |
| ------------------------ | ------------------------------------------ | ------------------------------- |
| Testy jednostkowe        | logika TS/JS (hooki, services, utils)      | Vitest + Testing Library        |
| Testy integracyjne       | Komponent-API, supabase service-database   | Vitest, Supabase test container |
| Testy kontraktowe        | JSON DTO vs. API                           | Pact, Zod schemas               |
| Testy E2E/UI             | Scenariusze użytkownika (desktop + mobile) | Playwright                      |
| Testy wydajnościowe      | API + front (Lighthouse)                   | K6, Lighthouse CI               |
| Testy regresji wizualnej | Krytyczne widoki                           | Playwright Trace/Snapshot       |
| Testy bezpieczeństwa     | Autoryzacja, XSS, CSRF                     | Zaproxy (skan), OWASP ZAP CLI   |
| Testy dostępności        | WCAG AA                                    | Playwright + axe-core           |

## 4. Scenariusze testowe (kluczowe)

1. Zarządzanie kontem  
   • Rejestracja → otrzymanie maila aktywacyjnego → logowanie → wylogowanie  
   • Reset hasła (żądanie + potwierdzenie z tokenem)  
   • Zmiana motywu - zapis w localStorage, respektowanie preferencji systemu  
   • Usunięcie konta (mock) – poprawny toast, brak regresji UI
2. Flashcards CRUD  
   • Dodanie pojedynczej fiszki (manual)  
   • Edycja front/back z automatyczną zmianą `source` na `ai_edited`  
   • Usunięcie fiszki  
   • Lista z paginacją, filtrowaniem `source`, sortowaniem
3. Generowanie fiszek (AI)  
   • Krok 1: walidacja długości tekstu (1 000–10 000)  
   • Krok 2: odbiór propozycji, akceptacja/edycja/odrzucenie, zapis zbiorczy  
   • Obsługa błędów OpenRouter (timeout, 4xx/5xx)
4. Sesja nauki  
   • Pobranie sesji (parametry count/source)  
   • Obsługa hot-keys (flip, score 0-5, strzałki)  
   • Zliczanie statystyk, ekran podsumowania
5. Nawigacja i middleware  
   • Dostęp anonimowy vs. zalogowany (przekierowania)  
   • Widoczność elementów UI (`SiteNavigation`, toasty)
6. Responsywność & A11y  
   • Widoki mobile/desktop (Tailwind breakpoints)  
   • Role ARIA, fokus, kontrast, nawigacja klawiaturą

## 5. Środowisko testowe

• Node 18 LTS, pnpm  
• Przeglądarki: Chromium, Firefox, WebKit (Playwright)  
• Supabase: lokalny container z seedem danych testowych  
• Klucze testowe do OpenRouter z limitem kosztów / stub z Mock Server  
• Pipeline CI (GitHub Actions) z matrycą OS (ubuntu-latest, windows-latest)

## 6. Narzędzia

- Vitest + @testing-library/react/astro-ct – unit/integration
- Playwright 1.x – E2E, mobile emulation, a11y, viz-reg
- K6 – testy obciążeniowe API
- Lighthouse CI – perf frontu
- Pact / Zod – kontrakty
- Coveralls + vitest-coverage – metryki pokrycia
- GitHub Actions – automatyzacja, reporting

## 7. Harmonogram (w iteracjach 2-tygodniowych)

| Tydzień | Aktywności                                                         |
| ------- | ------------------------------------------------------------------ |
| 1       | Konfiguracja narzędzi, mock Supabase & OpenRouter, skeleton testów |
| 2       | Unit tests: utils, hooki (60 % pokrycia)                           |
| 3       | Integracyjne: services ↔ Supabase, API positive paths             |
| 4       | E2E happy path (login, CRUD fiszek, generacja, nauka)              |
| 5       | A11y + responsywność, testy negatywne API                          |
| 6       | Wydajność API (K6) & front (Lighthouse)                            |
| 7       | Bezpieczeństwo podstawowe, regresja wizualna                       |
| 8       | Stabilizacja, full regression suite, raport końcowy                |

## 8. Kryteria akceptacji

1. Pokrycie kodu ≥ 80 % dla warstwy logiki (services, hooks)
2. Wszystkie scenariusze E2E przechodzą na 3 przeglądarkach i szerokościach (375/768/1280)
3. Lighthouse Performance ≥ 90 na desktop & mobile dla głównych stron
4. Brak otwartych defektów o priorytecie „wysoki” lub „krytyczny”
5. Testy CI zielone na gałęzi `main` przez dwa kolejne commit-sety

## 9. Role i odpowiedzialności

| Rola          | Odpowiedzialności                                                |
| ------------- | ---------------------------------------------------------------- |
| QA Lead       | Plan testów, priorytety, review raportów, komunikacja z zespołem |
| QA Engineer   | Implementacja i utrzymanie testów (unit, integ, E2E)             |
| Dev Backend   | Mocki Supabase/AI, naprawa defektów backendowych                 |
| Dev Frontend  | Poprawki UI, dostępność, responsywność                           |
| DevOps        | Utrzymanie pipeline CI, środowisk testowych                      |
| Product Owner | Akceptacja kryteriów testowych, decyzje o releasie               |

## 10. Procedury raportowania błędów

1. Defekt zakładany w GitHub Issues z etykietami `bug`, `priority:P{1-3}`, `area:{frontend|backend|e2e}`.
2. Minimalne dane: kroki reprodukcji, oczekiwany rezultat, faktyczny rezultat, środowisko, zrzut ekranu / trace.
3. QA Lead triage ≤ 24 h; przypisanie developera i sprintu.
4. Po naprawie – test re-verification oraz tag `fixed`, zamknięcie po sukcesie.

---

Plan zapewnia kompleksowe pokrycie funkcjonalne i niefunkcjonalne aplikacji, z uwzględnieniem kluczowych ryzyk (integracja AI, autoryzacja, wydajność). Przyjęta strategia testów gwarantuje szybką detekcję regresji i wysoką jakość produktu przed wdrożeniem produkcyjnym.
