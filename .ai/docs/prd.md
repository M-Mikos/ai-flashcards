# Dokument wymagań produktu (PRD) - AI-Flashcards

## 1. Przegląd produktu

AI-Flashcards to webowa aplikacja typu mobile-first umożliwiająca szybkie tworzenie i naukę fiszek edukacyjnych. Aplikacja generuje propozycje fiszek przy użyciu modeli AI na podstawie wklejonego przez użytkownika tekstu oraz pozwala na ręczne zarządzanie fiszkami. Zapamiętywanie wspierane jest poprzez integrację zewnętrznego algorytmu spaced-repetition.

## 2. Problem użytkownika

Manualne przygotowanie wysokiej jakości fiszek jest czasochłonne, co zniechęca do stosowania metody spaced-repetition. Użytkownicy potrzebują narzędzia, które automatycznie tworzy fiszki z tekstu źródłowego, pozwala wygodnie je modyfikować i powtarzać, zmniejszając nakład czasu i zwiększając efektywność nauki.

## 3. Wymagania funkcjonalne

1. Sesja generacji fiszek przez AI:
   - na podstawie tekstu (input 1 000–10 000 znaków, walidacja długości wejściowego tekstu we wszystkich warstwach (DB, BE, FE) z komunikatem błędu).
   - Listing wygenerowanych fiszek z przyciskami Accept / Edit / Reject.
   - Zapis wyłącznie zaakceptowanych (lub edytowanych i zaakceptowanych) fiszek do bazy.
2. Zarządzanie fiszkami użytkownika w ramach widoku listy "Moje fiszki"
   - wyświetlanie zapisanych fiszek
   - edycja zapisanych fiszek
   - usuwanie zapisanych fiszek
3. Manualne tworzenie pojedynczych fiszek (formularz z polami przód / tył) w ramach widoku listy "Moje fiszki".
4. Nauka fiszek wg harmonogramu w ramach widoku "Sesja nauki" - integraja z gotowym algorytmem:
   - Zapewnienie mechanizmu przypisywania fiszek do harmonogramu powtórek (korzystanie z gotowego algorytmu).
   - Brak dodatkowych metadanych i zaawansowanych funkcji powiadomień.
5. Prosty system kont i uwierzytelniania: rejestracja, logowanie, reset hasła (e-mail + token), usunięcie konta i powiązanych fiszek.
6. Statystyki: zapis źródła wygenerowania fiszki (ai/ai+edycja/manulanie) w tabeli fiszek, podstawowe logi błędów sesji generacji.
7. Responsywny, dostępny, prosty interfejs mobile-first.
8. Wymagania prawne i ograniczenia:

- Dane osobowe użytkowników i fiszek przechowywane zgodnie z RODO.
- Prawo do wglądu i usunięcia danych (konto wraz z fiszkami) na wniosek użytkownika.

## 4. Granice produktu

1. Brak implementacji własnego algorytmu spaced-repetition – używane jest gotowe rozwiązanie (, biblioteka open-source).
2. Brak importu plików (PDF, DOCX itp.).
3. Brak współdzielenia zestawów fiszek pomiędzy użytkownikami.
4. Brak aplikacji mobilnych native – tylko przeglądarka.
5. Brak wewnętrznych soft-limitów kosztów AI – kontrola po stronie providera.
6. Brak polityki moderacji treści na etapie MVP.
7. Brak automatycznych testów w fazie MVP (zostaną zaplanowane później).
8. Brak zaawansowanego wyszukiwania
9. Brak importu dokumentów (PDF, DOCX itp)
10. Brak publicznie dostępnego API
11. Obsługa tylko jednego, narzuconego w kodzie modelu do generowania fiszek "gpt-4o-mini"

## 5. Historyjki użytkowników

| ID     | Tytuł                                      | Opis                                                                                                                                             | Kryteria akceptacji                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-001 | Generowanie fiszek z tekstu przy użyciu AI | Jako zalogowany użytkownik, w widoku generowania fiszek, wklejam fragment artykułu (1 000–10 000 znaków) i otrzymuję listę proponowanych fiszek. | 1) Po wklejeniu poprawnego tekstu pojawia się lista 5-20 propozycji fiszek. 2) Dla tekstu < 1 000 znaków otrzymuję komunikat walidacji. 3) Dla tekstu > 10 000 znaków otrzymuję komunikat walidacji. 4) w przypadku problemów z API lub braku odpowiedzi modelu widzę stosowny komunikat o błędzie                                                                                                                                                                                                      |
| US-002 | Przegląd i zatwierdzanie propozycji fiszek | Jako użytkownik mogę edytować i zaakceptować listę propozycji fiszek.                                                                            | 1) Kliknięcie „Accept” zapisuje fiszkę w bazie danych, fiszka znika z listy 2) Kliknięcie „Delete” usuwa fiszkę z listy. 3) Kliknięcie "Edit" otwiera formularz edycji pozwalający wprowadzić zmiany w propozycji fiszki. Kliknięcie "Accept & save" zapisuje edytowaną fiszkę w bazie, fiszka znika z listy. 4) Na dole listy znajduje się przycisk "Save all" zapisujący wszystkie fiszki z aktualnego stanu listy. Pojawia się komunikat o zapisaniu fiszek i przekierowanie do widoku "Moje fiszki" |
| US-003 | Ręczne tworzenie fiszki                    | Jako użytkownik chcę ręcznie utworzyć fiszkę z polami front/back.                                                                                | 1) Kliknięcie przycisku "Add" w widoku "moje fiszki" otwiera formularz który umożliwia wpisanie front i back. 2) Zapis dodaje fiszkę do bazy. 3) Walidacja wymaga niepustych pól do 200 znaków (front) i 500 znaków (back).                                                                                                                                                                                                                                                                             |
| US-004 | Przeglądanie fiszek                        | Jako użytkownik chcę przeglądać zapisane fiszki w tabeli, widok "moje fiszki".                                                                   | 1) Widok listy pokazuje front, datę utworzenia oraz źródło.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| US-005 | Nauka fiszek                               | Jako zalogowany użytkownik chcę uczyć się fiszek zgodnie z harmonogramem spaced-repetition.                                                      | 1) W widoku "Sesja nauki" algorytm przygotowuje dla mnie sesję nauki fiszek 2) Na start wyświetlany jest przód fiszki, poprzez interakcję użytkownik wyświetla jej tył 3) Użytkownik ocenia zgodnie z oczekiwaniami algorytmu na ile przyswoił fiszkę 4) Następnie algorytm pokazuje kolejną fiszkę w ramach sesji nauki. 5) Po zakończeniu sesji nauki wyświetlany jest modal podsumowania ze średnią oceną fiszek.                                                                                    |
| US-006 | Edycja zapisanej fiszki                    | Jako użytkownik mogę edytować wcześniej zapisaną fiszkę.                                                                                         | 1) Kliknięcie „Edit” przy fiszce otwiera formularz. 2) Zmiany zapisują się w bazie i są widoczne na liście "moje fiszki".                                                                                                                                                                                                                                                                                                                                                                               |
| US-007 | Usunięcie fiszki                           | Jako użytkownik mogę usunąć fiszkę z bazy.                                                                                                       | 1) Kliknięcie „Delete” prosi o potwierdzenie. 2) Po potwierdzeniu fiszka znika bezpowrotnie z bazy i widoku.                                                                                                                                                                                                                                                                                                                                                                                            |
| US-008 | Rejestracja konta                          | Jako nowy użytkownik chcę założyć konto przy użyciu e-maila i hasła.                                                                             | 1) Formularz rejestracji wymaga unikalnego e-maila i silnego hasła. 2) Po wysłaniu otrzymuję e-mail aktywacyjny.                                                                                                                                                                                                                                                                                                                                                                                        |
| US-009 | Logowanie                                  | Jako użytkownik chcę zalogować się do aplikacji.                                                                                                 | 1) Poprawne dane logują i przenoszą widoku "Moje fiszki". 2) Błędne dane wyświetlają komunikat o błędzie.                                                                                                                                                                                                                                                                                                                                                                                               |
| US-010 | Reset hasła                                | Jako użytkownik, który zapomniał hasła, chcę je zresetować.                                                                                      | 1) Formularz resetu przyjmuje e-mail. 2) System wysyła token resetu. 3) Po podaniu nowego hasła konto jest aktywne z nowym hasłem.                                                                                                                                                                                                                                                                                                                                                                      |
| US-011 | Dostęp tylko po zalogowaniu                | Jako niezalogowany użytkownik nie powinienem mieć dostępu do żadnego z widoków ani akcji poza tymi związanymi z logowaniem lub rejestracą.       | 1) Próba wejścia na chronione strony przekierowuje na stronę logowania.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## 6. Metryki sukcesu

1. ≥ 75 % propozycji fiszek generowanych przez AI jest akceptowanych przez użytkowników.
2. ≥ 75 % wszystkich nowych fiszek pochodzi z generacji AI.
