# Plan implementacji widoku Account

## 1. Przegląd

Widok konta udostępnia użytkownikowi podstawowe informacje o profilu, kontrolę motywu (light/dark/system) oraz sekcję „danger zone” z akcjami wylogowania i mockowym usunięciem konta. Strona ma charakter makiety – integracje sieciowe będą dodane później.

## 2. Routing widoku

- Ścieżka: `/account` (chroniona, tylko dla zalogowanych).

## 3. Struktura komponentów

- `AccountPage` (wrapper layout)
  - `ProfileCard`
  - `ThemeToggle`
  - `DangerZoneCard`
    - `ConfirmationDialog` (dla usunięcia konta)
  - `LogoutButton`

## 4. Szczegóły komponentów

### AccountPage

- Opis: Layout strony konta; pobiera dane profilu (mock) i przekazuje do kart.
- Główne elementy: kontener z nagłówkiem, sekcje kart, grid/stack responsywny.
- Obsługiwane interakcje: deleguje akcje do dzieci; reaguje na sukces/errory przez toasty.
- Obsługiwana walidacja: brak bezpośredniej; zapewnia obecność danych profilu zanim wyrenderuje karty.
- Typy: `AccountViewModel`.
- Propsy: brak; używa hooków wewnętrznych (mock).

### ProfileCard

- Opis: Wyświetla e-mail i datę rejestracji.
- Główne elementy: tytuł, wiersze z label/value.
- Interakcje: brak.
- Walidacja: format daty (ISO -> czytelny); e-mail jako niepusty string.
- Typy: `AccountViewModel`.
- Propsy: `account: AccountViewModel`.

### ThemeToggle

- Opis: Przełącznik motywu z lokalnym stanem i synchronizacją z `localStorage` + `prefers-color-scheme`.
- Główne elementy: `Select` lub `SegmentedControl` z opcjami `light/dark/system`.
- Interakcje: `onChange(theme)` ustawia stan i zapisuje do storage; aktualizuje klasę `data-theme`/`class` na `<html>`.
- Walidacja: wartość musi należeć do `ThemeMode`.
- Typy: `ThemeMode`, `ThemeState`.
- Propsy: `value: ThemeMode`, `onChange(mode: ThemeMode)`.

### DangerZoneCard

- Opis: Sekcja z akcjami ryzykownymi – usunięcie konta i powiązanych danych (mock).
- Główne elementy: ostrzegawczy nagłówek, opis, przycisk „Delete account”.
- Interakcje: kliknięcie otwiera `ConfirmationDialog`; potwierdzenie wywołuje `onDelete`.
- Walidacja: wymaga podwójnego potwierdzenia (checkbox + modal), stan przycisku disabled gdy brak potwierdzenia.
- Typy: `DeleteAccountState`.
- Propsy: `onDelete(): Promise<void>`, `isDeleting: boolean`.

### ConfirmationDialog

- Opis: Modal z ostrzeżeniem; potwierdzenie operacji usunięcia.
- Główne elementy: tytuł, opis, pole „type DELETE” (opcjonalnie), przyciski confirm/cancel.
- Interakcje: `onConfirm`, `onCancel`.
- Walidacja: jeśli używamy pola tekstowego – wymóg wpisania `DELETE`; inaczej checkbox „I understand”.
- Typy: `ConfirmDialogProps`.
- Propsy: `open: boolean`, `onOpenChange`, `onConfirm`, `loading: boolean`.

### LogoutButton

- Opis: Przycisk wylogowania (mock); w przyszłości integracja z auth klientem.
- Główne elementy: przycisk z ikoną log-out.
- Interakcje: `onLogout()` – obecnie czyszczenie localStorage + toast; później wywołanie realnego klienta auth.
- Walidacja: blokada wielokrotnych kliknięć w trakcie `isLoggingOut`.
- Typy: `LogoutState`.
- Propsy: `onLogout(): Promise<void>`, `isLoggingOut: boolean`.

## 5. Typy

- `ThemeMode = "light" | "dark" | "system"`.
- `ThemeState { mode: ThemeMode; isSystemPreferredDark: boolean }`.
- `AccountViewModel { email: string; registeredAt: string; }`.
- `DeleteAccountState { isOpen: boolean; confirmationText: string; isDeleting: boolean; }`.
- `ConfirmDialogProps { open: boolean; loading?: boolean; title: string; description?: string; confirmLabel?: string; onConfirm: () => void; onOpenChange: (open: boolean) => void; }`.
- `LogoutState { isLoggingOut: boolean; }`.

## 6. Zarządzanie stanem

- Lokalny stan w `AccountPage`: `account` (mock), `theme` (persist w `localStorage`), `deleteState`, `logoutState`.
- Custom hook `useThemeMode`:
  - Odczyt z `localStorage`, fallback na `prefers-color-scheme`.
  - Aktualizacja klas na `document.documentElement`.
  - API: `{ mode, setMode }`.
- `useConfirmableAction` (opcjonalnie): zarządzanie otwarciem dialogu i loadingiem dla akcji krytycznych.

## 7. Integracja API

- Brak realnych endpointów (mock). Przygotować interfejsy do podpięcia:
  - `deleteAccount(): Promise<void>` – TODO: zastąpić realnym wywołaniem Supabase auth + cleanup.
  - `logout(): Promise<void>` – TODO: integracja z Supabase auth (signOut).
- W mocku: symulacja `Promise.resolve()` z opóźnieniem + toasty.

## 8. Interakcje użytkownika

- Zmiana motywu: wybór opcji -> zapis w storage -> aktualizacja motywu UI.
- Wylogowanie: kliknięcie -> stan `isLoggingOut` -> toast sukcesu/błędu.
- Usunięcie konta: kliknięcie „Delete account” -> dialog -> potwierdzenie -> `isDeleting` spinner -> toast wyniku.

## 9. Warunki i walidacja

- Theme: tylko wartości z `ThemeMode`.
- Delete: brak potwierdzenia => przycisk confirm disabled; opcjonalny wymóg wpisania `DELETE`.
- Logout/Delete: blokada wielokrotnego kliknięcia w trakcie operacji (disable + spinner).
- Dane profilu: e-mail niepusty, data rejestracji w formacie ISO (parsowana do czytelnego formatu).

## 10. Obsługa błędów

- Mockowe wywołania mogą rzucać błędy: prezentować toast „Operacja nieudana, spróbuj ponownie”.
- Przy błędzie zapisu motywu: pokazać toast i pozostawić poprzedni stan.
- Dialog pozostaje otwarty przy błędzie usunięcia; umożliwić ponowną próbę.

## 11. Kroki implementacji

1. Dodać trasę `/account` (Astro page + React island jeśli potrzeba interakcji).
2. Utworzyć typy i hook `useThemeMode` w `src/components/hooks` lub `src/lib`.
3. Zaimplementować `AccountPage` z mockowym pobraniem profilu.
4. Dodać `ProfileCard` z prezentacją e-maila i daty rejestracji.
5. Dodać `ThemeToggle` (select/segment + zapis w `localStorage`, respekt `prefers-color-scheme`).
6. Dodać `LogoutButton` z mockowym `logout` i toastami.
7. Dodać `DangerZoneCard` + `ConfirmationDialog` z podwójnym potwierdzeniem i stanem ładowania.
8. Spiąć zdarzenia w `AccountPage` (toasty sukces/błąd, disable w trakcie akcji).
9. Zadbać o responsywny layout (mobile-first) oraz dostępność (ARIA dla modala, focus trap).
10. Dodać krótkie testy manualne scenariuszy: zmiana motywu, wylogowanie, otwarcie/obsługa dialogu usunięcia.
