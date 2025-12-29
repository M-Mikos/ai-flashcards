<conversation_summary>

<decisions>
1. Struktura fiszki to prosty obiekt z polami "przód" oraz "tył".
2. Algorytm powtórek pozostaje całkowicie zewnętrzny; wybór providera zostanie dokonany później.
3. Interfejs listingu fiszek zawiera przyciski Accept / Edit / Reject; w tabeli fiszek jedno pole „source”, dodatkowo możliwa osobna tabela logów sesji generowania.
4. Wprowadzany tekst ograniczony do 1000–10 000 znaków; walidacja na poziomie DB, BE oraz FE (komunikat inline).
5. System logowania: e-mail + hasło + reset; aspekty bezpieczeństwa pozostawione zewnętrznemu providerowi.
6. Kryteria sukcesu mierzone bezpośrednio na danych z tabeli fiszek; brak dedykowanych logów i dashboardu.
7. Limity kosztów i zużycia tokenów kontrolowane wyłącznie przez providera; brak wewnętrznych soft-limitów i monitoringu.
8. Na etapie MVP brak polityk ani ograniczeń dotyczących treści użytkowników.
9. UI mobile-first z prostym wertykalnym layoutem; podstawowa zgodność z WCAG AA.
10. Brak implementacji testów na tym etapie.
</decisions>

<matched_recommendations>
1. Porównanie dostawców zewnętrznego algorytmu powtórek pod kątem kosztów i SLA przed finalnym wyborem.
2. Utworzenie lekkiej tabeli logów sesji generowania AI, aby analizować wzorce akceptacji/odrzuceń bez przechowywania pełnych treści.
3. Implementacja walidacji limitu znaków (1000–10 000) we wszystkich warstwach: DB, BE, FE.
4. Zapewnienie podstawowej dostępności WCAG AA w komponentach UI (kontrast ≥ 4.5:1, focus states).
</matched_recommendations>

<prd_planning_summary>
Produkt ma rozwiązać problem czasochłonnego, ręcznego tworzenia wysokiej jakości fiszek poprzez zaoferowanie webowej aplikacji, która generuje fiszki z dostarczonego tekstu (1000–10 000 znaków) przy użyciu modeli AI oraz integruje gotowy algorytm spaced-repetition.

a. Główne wymagania funkcjonalne
• Generowanie fiszek przez AI na podstawie wklejonego tekstu.
• Manualne tworzenie, edycja, usuwanie i przeglądanie fiszek.
• Interface listingu z przyciskami Accept / Edit / Reject; akceptowane fiszki zapisywane w tabeli głównej, odrzucone fiszki przepadają.
• Prosta autoryzacja e-mail + hasło + reset.
• Integracja zewnętrznym algorytmem powtórek.
• Mobile-first UI z podstawową zgodnością WCAG AA.

b. Kluczowe historie użytkownika
• Jako zalogowany użytkownik wklejam fragment artykułu (≤ 10 000 znaków) i otrzymuję  listę proponowanych fiszek, gdzie każdą fiszkę mogę zaakceptować, edytować lub odrzucić.
• Jako zalogowany użytkownik mogę stworzyć fiszkę ręcznie.
• Jako zalogowany użytkownik mogę przeglądać i powtarzać zapisane fiszki według harmonogramu dostarczonego przez zewnętrzny algorytm.
• Jako użytkownik mogę zalogować się przy użyciu e-maila i zresetować hasło, gdy je zgubię.

c. Kryteria sukcesu i pomiar
• 75 % wygenerowanych fiszek jest akceptowanych przez użytkowników.
• 75 % wszystkich nowych fiszek pochodzi z generacji AI.
Pomiar: proste zapytania SQL na tabeli fiszek (np. accepted/total_generated).
</prd_planning_summary>

<unresolved_issues>
1. Konkretny wybór i integracja providera spaced-repetition.
2. Brak planu testów automatycznych i kryteriów jakościowych przed produkcyjnym release.
</unresolved_issues>

</conversation_summary>

