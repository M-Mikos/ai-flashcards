# Specyfikacja modułu autentykacji (US-008–US-011)

## Cel i zakres

- Zapewnienie rejestracji, logowania, wylogowania, resetu hasła oraz usunięcia konta wraz z powiązanymi fiszkami z wykorzystaniem Supabase Auth, zgodnie z PRD (US-008 – US-011) i bez naruszania istniejących widoków nauki/generacji fiszek.
- Wymagany redirect po skutecznym logowaniu do widoku „Moje fiszki” (istniejący widok aplikacji).
- Blokada dostępu do widoków aplikacji dla niezalogowanych użytkowników; dostępne publicznie pozostają wyłącznie ścieżki auth.

## Stack i integracje

- Astro 5 (pages routing, middleware), React 19 (wyspy dla formularzy), TypeScript 5, Tailwind 4, Shadcn/ui.
- Supabase Auth (email+hasło, magic link resetu/zmiany hasła), `@supabase/ssr` do obsługi cookie-session po stronie serwera/SSR.
- Supabase service role (admin API) wyłącznie do operacji destrukcyjnych, w szczególności do usuwania konta i danych użytkownika; wymaga `SUPABASE_SERVICE_ROLE_KEY` w środowisku.

## Architektura interfejsu użytkownika

### Layouty i nawigacja

- `src/layouts/AuthLayout.astro`: minimalny layout auth (logo, lead, link do logowania/rejestracji, brak głównej nawigacji aplikacji).
- `src/layouts/AppLayout.astro` (istniejący/rozszerzony): główny layout aplikacyjny; warstwa nawigacji pokazuje link „Wyloguj” oraz status użytkownika (email).
- Przekierowania: próba wejścia na strony aplikacyjne bez sesji → redirect do `/auth/login` z param `next=<ścieżka>`.

### Strony Astro (warstwa routingu + SSR danych)

- `src/pages/auth/login.astro`: renderuje layout + wyspę React `LoginForm`; SSR odczytuje sesję z Supabase – jeśli istnieje, redirect do „Moje fiszki”.
- `src/pages/auth/register.astro`: renderuje `RegisterForm`; redirect do aplikacji, jeśli sesja istnieje.
- `src/pages/auth/reset.astro`: formularz żądania resetu (`ResetRequestForm`), potwierdzenie wysłania maila.
- `src/pages/auth/reset/confirm.astro`: formularz ustawienia nowego hasła po kliknięciu linku z maila (Supabase `access_token` w URL); integracja z Supabase `auth.exchangeCodeForSession`.
- `src/pages/logout.astro` lub akcja w komponencie nawigacji: wykonuje API `POST /api/auth/logout` i redirect do `/auth/login`.
- `src/pages/settings/account.astro` (chroniona, AppLayout): sekcja zarządzania kontem z informacją o skutkach usunięcia konta oraz wyspą `DeleteAccountForm`; po sukcesie redirect do `/auth/login` z komunikatem.
- Chronione widoki aplikacji (np. generowanie fiszek, „Moje fiszki”, „Sesja nauki”) pozostają w swoich plikach, ale są osłonięte middleware (patrz niżej).

### Komponenty React (klient)

- `src/components/auth/AuthCard.tsx`: wspólna karta z nagłówkiem/opisem; używana przez wszystkie formularze.
- `LoginForm.tsx`: pola email/hasło, obsługa submit → POST `/api/auth/login`; pokazuje stany: loading, błąd (np. „Nieprawidłowe dane logowania”), sukces → redirect.
- `RegisterForm.tsx`: pola email, hasło, powtórz hasło; submit → POST `/api/auth/register`; po sukcesie komunikat o wysłaniu maila aktywacyjnego; opcjonalnie link do logowania.
- `ResetRequestForm.tsx`: pole email; submit → POST `/api/auth/reset`; komunikat sukcesu o wysłaniu maila.
- `ResetConfirmForm.tsx`: pola nowe hasło + powtórz; token z URL; submit → POST `/api/auth/reset/confirm`; sukces → redirect do logowania z komunikatem.
- `DeleteAccountForm.tsx`: przycisk z potwierdzeniem (np. checkbox „Rozumiem, że usuwam wszystkie fiszki”) → DELETE `/api/auth/account`; pokazuje stany: loading, sukces (redirect do logowania) oraz błędy krytyczne.
- Wspólne elementy: `PasswordStrengthHint`, `FormError`, `FormSuccess`, `SpinnerButton`, walidacja client-side (Zod) z mapowaniem na komunikaty UI.

### Walidacja i komunikaty FE

- Email: format RFC5322, trim, lowercase; komunikaty: „Podaj poprawny email”.
- Hasło (silne, zgodnie z US-008): min 12 znaków, min 1 wielka/mała litera, cyfra, znak specjalny; komunikaty szczegółowe, wyświetlane w formie checklisty.
- Powtórzenie hasła: musi match.
- Reset: brak ujawniania istnienia konta – zawsze komunikat ogólny („Jeśli email istnieje, wysłaliśmy instrukcje resetu”).
- Błędy Supabase mapowane na przyjazne teksty (np. duplicate email → „Konto z tym adresem już istnieje”).

### Kluczowe scenariusze UI

- Rejestracja: poprawne dane → komunikat o mailu aktywacyjnym; brak auto-loginu przed potwierdzeniem.
- Logowanie: po sukcesie redirect do „Moje fiszki” albo do `next`; błędne dane → komunikat błędu bez resetu formularza.
- Reset hasła: request → komunikat sukcesu; po kliknięciu linku z maila → formularz nowego hasła → po sukcesie redirect do logowania.
- Dostęp chroniony: brak sesji → redirect do `/auth/login?next=...`; obecna sesja na stronach auth → redirect do aplikacji.

## Logika backendowa

### Klienci i serwisy

- `src/db/supabaseServer.ts`: Supabase klient serwerowy (`@supabase/ssr`, cookie-based) używany w API i middleware.
- `src/db/supabaseBrowser.ts`: Supabase klient przeglądarkowy dla ewentualnych wysp (ograniczony do auth akcji, bez bezpośrednich mutacji danych domenowych).
- `src/db/supabaseServiceRole.ts`: Supabase klient z service role key (admin API) do operacji wymagających uprawnień wykraczających poza sesję użytkownika (np. usunięcie konta); nigdy nie wykorzystywany po stronie klienta.
- `src/lib/auth/authService.ts`: funkcje wysokiego poziomu dla rejestracji, logowania, resetu, wylogowania; centralizacja mapowania błędów Supabase na kody domenowe.
- `authService.deleteAccount`: przyjmuje `userId`; w transakcji usuwa dane domenowe użytkownika (np. fiszki, logi sesji generacji) i wywołuje `supabaseAdmin.auth.admin.deleteUser`; zwraca wynik bez ujawniania szczegółów błędu.
- `src/lib/validation/authSchemas.ts`: Zod schematy dla wszystkich payloadów; współdzielone między FE i API.

### Endpointy API (Astro pages/api)

- `POST /api/auth/register`: body {email, password}; walidacja Zod; wywołuje `supabase.auth.signUp` z `emailRedirectTo=/auth/reset/confirm` (lub stroną potwierdzenia); 201 na sukces, 400/409/500 na błędy.
- `POST /api/auth/login`: body {email, password}; walidacja; `supabase.auth.signInWithPassword`; ustawia cookie session via `@supabase/ssr` helper; 200 na sukces, 401 na złe dane.
- `POST /api/auth/logout`: czyści cookie session; 200 idempotentne.
- `POST /api/auth/reset`: body {email}; walidacja; `supabase.auth.resetPasswordForEmail` z redirectem do `/auth/reset/confirm`; zawsze 200 (aby nie ujawniać istnienia konta), błędy krytyczne → 500 z generowanym request id do logów.
- `POST /api/auth/reset/confirm`: body {password}; token (`code`/`access_token`) z cookies/URL; walidacja hasła; `supabase.auth.exchangeCodeForSession` + `auth.updateUser({password})`; opcjonalnie automatyczny sign-in → redirect do aplikacji lub do logowania.
- `GET /api/auth/session`: zwraca minimalny profil sesji (email, user_id) na potrzeby frontu; 401 jeśli brak sesji.
- `DELETE /api/auth/account`: wymaga aktywnej sesji (middleware SSR); używa `supabaseServiceRole` do usunięcia danych domenowych użytkownika oraz `auth.admin.deleteUser`; 204 na sukces, 401/500 na błędy; re-use walidacji/obsługi błędów w `authService`.

### Walidacja danych wejściowych

- Zod schematy wspólne (FE+BE), z pre-trim i normalizacją email do lowercase.
- Early-return na błędne dane; w API zawsze zwracamy JSON `{error:{code,message}}`.

### Obsługa wyjątków i logowanie

- Centralne mapowanie błędów Supabase (np. `User already registered`, `Invalid login credentials`) na kody domenowe (`auth/email-taken`, `auth/invalid-credentials`, `auth/token-invalid`).
- Logi serwerowe z kontekstem `requestId`, typem akcji i user agent; bez logowania haseł/tokenów.
- Odpowiedzi przyjazne, ale bez ujawniania istnienia kont (reset).

### Renderowanie server-side i middleware

- `src/middleware/index.ts`: na wejściu do chronionych ścieżek tworzy serwerowy Supabase klient, pobiera sesję; brak sesji → redirect do `/auth/login?next=...`; przy istniejącej sesji dodaje `locals.user` (id, email) do dalszego renderowania stron Astro.
- Astro pages wykorzystują `locals.user` do SSR (np. w „Moje fiszki”) bez dodatkowych wywołań auth.
- `astro.config.mjs`: musi mieć włączone `experimental.ssr`/middleware (zgodnie z obecnymi ustawieniami projektu); brak zmian w istniejącej konfiguracji poza potrzebnym importem middleware (jeśli nie jest aktywny).

## System autentykacji z Supabase

- Rejestracja: `auth.signUp({ email, password, options: { emailRedirectTo }})`; status: email aktywacyjny wymagany przed pierwszym logowaniem.
- Logowanie: `auth.signInWithPassword`; zapis sesji w cookie via `@supabase/ssr`; redirect do „Moje fiszki”.
- Wylogowanie: `auth.signOut`; czyszczenie cookies (access/refresh).
- Reset hasła: `auth.resetPasswordForEmail` z redirectem do `/auth/reset/confirm`; po kliknięciu linku `exchangeCodeForSession` + `updateUser({password})`.
- Usunięcie konta: endpoint server-side korzysta z service role; najpierw usuwa dane domenowe użytkownika (fiszki, logi) w transakcji lub poprzez klucze obce z `ON DELETE CASCADE`, następnie wywołuje `auth.admin.deleteUser`. Operacja jest nieodwracalna i kończy sesję.
- Ochrona danych domenowych: wszystkie istniejące API/SSR operujące na fiszkach powinny korzystać z `locals.user` i user_id z Supabase, bez przekazywania user_id z klienta.

## Zgodność z istniejącą aplikacją

- Chronione widoki (generowanie fiszek, „Moje fiszki”, „Sesja nauki”) pozostają w dotychczasowych plikach; dodajemy jedynie sprawdzenie `locals.user` i ewentualny redirect – brak modyfikacji logiki fiszek.
- Brak ujawniania informacji o istnieniu kont w resetach; brak zmian w modelu fiszek.
- UI auth w osobnym layoutcie, nie wpływa na styling aplikacyjny poza dodaniem pozycji „Wyloguj” i ewentualnie avatara/emailu w nawigacji.
- PRD US-008–US-011 są pokryte: rejestracja/login/reset zgodnie z Supabase; dostęp tylko po zalogowaniu via middleware; usunięcie konta wraz z fiszkami poprzez dedykowany endpoint z service role i stronę ustawień konta.
