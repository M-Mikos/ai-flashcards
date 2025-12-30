# Architektura UI dla AI-Flashcards

## 1. Przegląd struktury UI

Aplikacja AI-Flashcards to responsywny, mobile-first SPA zbudowany w Astro 5 + React 19 + Tailwind 4 oraz komponentami Shadcn/ui. Interfejs składa się z czterech głównych, chronionych widoków aplikacji (Moje fiszki, Sesja nauki, Generuj, Konto) oraz widoków uwierzytelniania (Logowanie, Rejestracja, Reset hasła). Nawigacja zmienia się kontekstowo – na desktopie dostępny jest górny pasek, a na mobile dolny pasek z ikonami. Całość obsługiwana jest przez globalny interceptor zapytań HTTP, który dołącza token Supabase, mapuje kody błędów na komunikaty Toast oraz wymusza przekierowania przy 401.

## 2. Lista widoków

### 2.1 Moje fiszki

- **Ścieżka**: `/`
- **Cel**: przegląd i zarządzanie zapisanymi fiszkami użytkownika.
- **Kluczowe informacje**: front fiszki, data utworzenia, źródło, filtr „source”, sortowanie, licznik postępu scrolla, przyciski "generuj fiszki", "utwórz fiszkę".
- **Kluczowe komponenty**: Navbar/BottomNav, InfiniteFlashcardGrid (Card, Skeleton), FilterSelect, SortSelect, Dialog (Edit/Delete), Toast, ActionButtons.
- **UX / A11y / bezpieczeństwo**: infinite-loading z triggerem przy 80 % scrolla; jednolita wysokość kart (ellipsis po 3 liniach front); aria-labels dla przycisków; operacje PATCH/DELETE zabezpieczone tokenem i potwierdzeniem.

### 2.2 Generuj

- **Ścieżka**: `/generate`
- **Cel**: dwukrokowy kreator generacji fiszek przez AI.
- **Kluczowe informacje**: krok 1 – textarea z licznikiem znaków i walidacją 1 000–10 000; krok 2 – grid propozycji (front/back) z Accept/Edit/Reject oraz „Accept all”.
- **Kluczowe komponenty**: TextareaWithCounter, ValidationMessage, Stepper, AIFlashcardGrid, Dialog (Edit), Button (Accept/Reject/AcceptAll), Toast.
- **UX / A11y / bezpieczeństwo**: natychmiastowa walidacja długości; skeletony podczas oczekiwania na odpowiedź AI; obsługa 400/500 z API; aria-live region dla statusów; limit 20 propozycji; po przyjęciu wszystkiego redirect do `/`.

### 2.3 Sesja nauki

- **Ścieżka**: `/learn`
- **Cel**: przeprowadzanie sesji nauki zgodnie z harmonogramem spaced-repetition.
- **Kluczowe informacje**: licznik postępu (x/z), bieżąca fiszka (front/back), przyciski ocen 0-5, hot-keys.
- **Kluczowe komponenty**: LearningCard (flip, aria-expanded), ProgressCounter, ScoreButtons, HotkeyHandler, SummaryModal, Toast.
- **UX / A11y / bezpieczeństwo**: focus-ring po flip; obsługa Space/Enter/0-5/→; aria-live dla postępu; komunikaty o braku kart; zabezpieczenie 401.

### 2.4 Konto

- **Ścieżka**: `/account`
- **Cel**: ustawienia konta, dark-mode toggle, usunięcie konta.
- **Kluczowe informacje**: e-mail, data rejestracji, przełącznik dark-mode, przycisk „Delete account”.
- **Kluczowe komponenty**: ProfileCard, ThemeToggle, DangerZoneCard, ConfirmationDialog, Toast.
- **UX / A11y / bezpieczeństwo**: ThemeToggle używa localStorage + prefers-color-scheme; usunięcie konta wymaga podwójnego potwierdzenia; operacja DELETE wymusza ponowne logowanie.

### 2.5 Logowanie

- **Ścieżka**: `/login`
- **Cel**: uwierzytelnienie użytkownika.
- **Kluczowe informacje**: pola e-mail i hasło, link „Forgot password?”.
- **Kluczowe komponenty**: AuthForm, Button, Toast.
- **UX / A11y / bezpieczeństwo**: inline walidacja; toast przy błędach 400/401; token zapisywany w secure, http-only cookie.

### 2.6 Rejestracja

- **Ścieżka**: `/register`
- **Cel**: tworzenie nowego konta.
- **Kluczowe informacje**: pola e-mail, hasło, hasło powtórzone.
- **Kluczowe komponenty**: AuthForm, PasswordStrengthMeter, Toast.
- **UX / A11y / bezpieczeństwo**: walidacja siły hasła; e-mail uniklany; po sukcesie redirect `/login` z toastem.

### 2.7 Reset hasła

- **Ścieżki**: `/reset-password`, `/reset-password/:token`
- **Cel**: reset utraconego hasła.
- **Kluczowe informacje**: formularz e-mail / formularz nowe hasło + potwierdzenie.
- **Kluczowe komponenty**: EmailForm, NewPasswordForm, Toast.
- **UX / A11y / bezpieczeństwo**: token w linku, hasło z walidacją; komunikaty 400/410 (token expired).

## 3. Mapa podróży użytkownika

1. **Nowy użytkownik**  
   a. Otwiera `/register` → rejestracja → e-mail z linkiem aktywacyjnym.  
   b. Po aktywacji loguje się (`/login`) → redirect do `/`.
2. **Generowanie fiszek**  
   a. Z `/` wybiera „Generuj” → `/generate` krok 1.  
   b. Wkleja tekst (1 000–10 000) → walidacja → POST `/api/generations`.  
   c. Krok 2: prezentacja propozycji → Accept/Reject/Edit (PATCH lokalny).  
   d. „Accept all” → POST `/api/flashcards/bulk` → redirect `/` + toast.
3. **Manualne dodanie fiszek**
   a. Z `/` wybiera „Utwórz fiszkę” → Dialog → PATCH `/api/flashcards`
4. **Zarządzanie fiszkami**  
   a. Scrolluje listę z auto-ładowaniem.  
   b. Klik „Edit” → Dialog → PATCH `/api/flashcards/:id`.  
   c. Klik „Delete” → potwierdzenie → DELETE `/api/flashcards/:id`.
5. **Sesja nauki**  
   a. Z Navbar wybiera „Sesja nauki” → `/learn`.  
   b. POST `/api/learning/session` → prezentacja kart.  
   c. Flip + ocena 0-5 (POST `/api/learning/feedback`) → następna karta aż do końca.  
   d. SummaryModal → „Finish” redirect `/`.

## 4. Układ i struktura nawigacji

- **Desktop**: górny Navbar (logo + linki Moje fiszki, Sesja nauki, Generuj, Konto, Logout).
- **Mobile**: BottomNav z ikonami (home, play, ai, user).
- **Routing**: Astro middleware sprawdza token; `/login`, `/register`, `/reset-password*` są publiczne, reszta przekierowuje do `/login` przy braku tokenu.
- **Link aktywny**: podkreślenie + aria-current.
- **Breadcrumbs**: nie wymagane, ścieżki płytkie.

## 5. Kluczowe komponenty (wielokrotnego użytku)

| Komponent             | Opis                                        | Uwagi a11y / UX                                 |
| --------------------- | ------------------------------------------- | ----------------------------------------------- |
| Navbar / BottomNav    | Główna nawigacja, adaptacyjna               | role="navigation", aria-label                   |
| Button (Shadcn)       | Podstawowy przycisk akcji                   | Domyślne style zapewniają kontrast & focus-ring |
| Card                  | Prezentacja pojedynczej fiszki / propozycji | aria-label z treścią front                      |
| Dialog                | Modal do edycji / potwierdzeń               | focus-trap, aria-modal                          |
| Toast                 | Komunikaty zwrotne                          | aria-live polite                                |
| Skeleton              | Zaślepki ładowania                          | animacja puls                                   |
| InfiniteFlashcardGrid | Grid + hook scroll observer                 | min-width 240 px                                |
| LearningCard          | Karta flip z front/back                     | aria-expanded, keyboard flip                    |
| ProgressBar           | Pasek postępu sesji                         | aria-valuenow / max                             |
| ThemeToggle           | Przełącznik dark-mode                       | aria-label, localStorage                        |
| ConfirmationDialog    | Potwierdzenia destrukcyjnych akcji          | wymaga wpisania „DELETE” przy usuwaniu konta    |

---

Architektura powyżej mapuje wszystkie historyjki użytkownika (US-001 – US-011) na konkretne widoki i komponenty, wykorzystując punkty końcowe API (`/api/generations`, `/api/flashcards*`, `/api/learning/*`, auth Supabase). Uwzględnia walidacje długości, obsługę kodów błędów, responsywność, dostępność (WCAG) oraz bezpieczeństwo (token, potwierdzenia, limity).
