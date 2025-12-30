<conversation_summary>
<decisions>

1. Kluczowe widoki: „Moje fiszki” (domyślny), „Sesja nauki”, „Generuj”, „Konto”; responsywny pasek nawigacji (desktop: górny navbar, mobile: bottom-nav) wykorzystujący Shadcn/ui.
2. Flow generowania fiszek: dwukrokowy ‑ Krok 1: textarea (licznik znaków, walidacja 1 000–10 000) z komunikatami błędów; Krok 2: grid wygenerowanych fiszek z przyciskami Accept/Edit/Reject oraz globalnym „Accept all”. Po akceptacji przekierowanie do „Moje fiszki”.
3. Edycja i manualne dodawanie fiszki odbywa się w modalnym komponencie Dialog (Shadcn/ui) z polami front/back oraz inline walidacją długości.
4. Widok „Moje fiszki”: filtr „source”, sortowanie created_at asc/desc, infinite-loading z pageSize = 24; karty o jednolitej wysokości (ellipsis po 3 liniach front, przyciski edycji i usunięcia).
5. Widok „Sesja nauki”: licznik postępu (x/z), klawisze hot-keys (Space/Enter flip, 0-5 ocena, → skip), przyciski ocen 0-5, bez lokalnego limitu kart (używany jest zwrot z API). Po zakończeniu sesji modal podsumowania.
6. Breakpointy Tailwind: grid-cols-1 (< 640 px), 2 (md), 3 (lg), 4 (xl); minimalna szerokość karty 240 px.
7. Komponenty Shadcn/ui do użycia: Button, Card, Dialog, Table, Toast, Skeleton; korzystać z domyślnych stylów Shadcn (WCAG, focus-ring, kontrast).
8. Zarządzanie stanem: TanStack Query bez persistera/cache; proste fetch-muta-invalidate.
9. Obsługa błędów: 400 inline, 401 toast + redirect /login, 404 toast „Item not found”, 429 toast rate-limit, 5xx toast generic.
10. Dostępność: flip card jako button z aria-expanded; focus-ring outline-2; dark-mode (Tailwind class) z przełącznikiem w „Konto”.
    </decisions>
    <matched_recommendations>
11. Dwukrokowy kreator generacji z walidacją długości.
12. Reużywalny Dialog do edycji propozycji i manualnych fiszek.
13. Użycie Shadcn Button, Card, Dialog, Table, Toast, Skeleton.
14. Infinite-loading z pageSize = 24 i triggerem przy 80 % scrolla.
15. Hot-keys w „Sesji nauki” (Space/Enter, 0-5, →).
16. Desktop top-navbar / Mobile bottom-nav.
17. Dark-mode toggle z localStorage + prefers-color-scheme.
18. Centralny interceptor HTTP mapujący kody błędów na toast/redirect.
19. Jednolita wysokość kart z ellipsis i Skeleton alignment.
20. WCAG focus-ring i kontrast przy domyślnych stylach Shadcn.
    </matched_recommendations>
    <ui_architecture_planning_summary>
    MVP UI będzie zbudowane w Astro 5 + React 19 + TypeScript 5 z Tailwind 4 i komponentami Shadcn/ui.

21. Struktura widoków i nawigacja
    • Cztery główne strony: „Moje fiszki” (/), „Sesja nauki” (/learn), „Generuj” (/generate), „Konto” (/account).  
    • Routing chroniony middlewarem – trasy poza /login /register wymagają tokenu Supabase.  
    • Nawigacja responsywna: desktop ‑ górny pasek, mobile ‑ bottom-nav z ikonami.

22. Kluczowe przepływy
    • Generowanie: textarea ➝ walidacja ➝ żądanie POST /api/generations ➝ grid propozycji ➝ (modal edit) ➝ Accept/Reject ➝ Accept-all POST /api/flashcards/bulk ➝ redirect.
    • Przegląd fiszek: GET /api/flashcards (infinite scroll). Filtr źródła + sort; edycja lub usunięcie (PATCH/DELETE) w Dialog.
    • Nauka: POST /api/learning/session ➝ prezentacja kart ➝ flip + ocena (POST /api/learning/feedback) ➝ summary modal.

23. Integracja z API i stan
    • TanStack Query do pobierania/podmutowania danych; brak trwałego cache – proste invalidacje.  
    • Globalny axios/fetch interceptor: dołącz token, obsłuż kody błędów, wywołaj toast, invaliduj cache.

24. Responsywność, dostępność, bezpieczeństwo
    • Grid kolumn zmienny wg breakpointów; karty min-width 240 px.  
    • Komponenty Shadcn zapewniają kontrast & focus-ring; flip-card z aria-expanded i klawiaturą.  
    • Dark-mode z Tailwind; przełącznik w „Konto”.  
    • Bezpieczeństwo: token Supabase w nagłówkach, 401 redirect, CSRF nie dotyczy (same-origin SPA).
    </ui_architecture_planning_summary>
    <unresolved_issues>
    Brak krytycznych nierozwiązanych kwestii – wszystkie główne decyzje podjęte. Detale implementacyjne (np. dokładne style Skeleton, animacje flip) pozostają do dopracowania podczas developmentu.
    </unresolved_issues>
    </conversation_summary>
