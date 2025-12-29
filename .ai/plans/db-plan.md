# Schemat bazy danych – AI-Flashcards (PostgreSQL)

## 1. Tabele, kolumny i ograniczenia

### 1.1. `users`

 Tabela “users” będzie obsługiwana przez Supabase Auth

### 1.2. `generations`
| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL**, FK → `auth.users(id)` **ON DELETE CASCADE** |
| `hash` | `text` | **NOT NULL** |
| `input_length` | `integer` | **NOT NULL**, `CHECK (input_length BETWEEN 1000 AND 10000)` |
| `generation_time_ms` | `integer` | **NOT NULL**, `CHECK (generation_time_ms > 0)` |
| `generated_count` | `smallint` | **NOT NULL**, `CHECK (generated_count >= 0)` |
| `accepted_count` | `smallint` | **NOT NULL**, `CHECK (accepted_count >= 0)` |
| `accepted_edited_count` | `smallint` | **NOT NULL**, `CHECK (accepted_edited_count >= 0)` |
| `model_name` | `varchar(64)` | **NOT NULL** |
| `created_at` | `timestamptz` | `DEFAULT now()` |
| `updated_at` | `timestamptz` | |

> Unikalność `hash` nie jest wymuszana – wiele sesji może mieć ten sam hash wejścia.

---

### 1.3. `flashcards`
| Kolumna | Typ | Ograniczenia |
|---------|-----|--------------|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` |
| `user_id` | `uuid` | **NOT NULL**, FK → `auth.users(id)` **ON DELETE CASCADE** |
| `generation_id` | `uuid` | FK → `generations(id)` **ON DELETE CASCADE**, *NULLABLE* |
| `front` | `varchar(200)` | **NOT NULL**, `CHECK (char_length(front) <= 200)` |
| `back` | `varchar(500)` | **NOT NULL**, `CHECK (char_length(back) <= 500)` |
| `source` | `source_enum` | **NOT NULL** (patrz typy zdefiniowane niżej) |
| `created_at` | `timestamptz` | `DEFAULT now()` |
| `updated_at` | `timestamptz` | |

Typ `source_enum`:
```sql
CREATE TYPE source_enum AS ENUM ('ai_generated', 'ai_edited', 'manual');
```

---

## 2. Relacje między tabelami
1. **`auth.users` 1 — N `generations`** (cascade przy usunięciu użytkownika).
2. **`auth.users` 1 — N `flashcards`** (cascade przy usunięciu użytkownika).
3. **`generations` 1 — N `flashcards`** (opcjonalne, *NULLABLE* FK; cascade przy usunięciu pokolenia usuwa powiązane fiszki).

Diagram ER (opisowy):
```
users ──< generations ──< flashcards
   |                          ^
   └──────────────<───────────┘
```

## 3. Indeksy
| Tabela | Kolumny | Cel |
|--------|---------|-----|
| `generations` | `(user_id, created_at DESC)` | Szybkie listowanie sesji użytkownika w porządku chronologicznym |
| `flashcards` | `(user_id, created_at DESC)` | Szybkie listowanie fiszek użytkownika w porządku chronologicznym |
| `flashcards` | `(generation_id)` | Wydajne pobieranie fiszek danej generacji |

> Dodatkowe indeksy będą dodawane na podstawie realnych wzorców użycia (np. `source`).

## 4. Zasady PostgreSQL (Row-Level Security)

### 4.1. Konfiguracja
```sql
-- Aktywacja RLS
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Rola administracyjna z uprawnieniem BYPASSRLS
grant bypassrls on database current_database() to admin;
```

### 4.2. Polityki
```sql
-- Dostęp właściciela (SELECT/INSERT/UPDATE/DELETE)
CREATE POLICY generations_user_policy
    ON generations
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY flashcards_user_policy
    ON flashcards
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
```

> Rola `admin` ma pełny dostęp dzięki `BYPASSRLS`.

## 5. Dodatkowe uwagi
1. **Normalizacja**: Schemat spełnia 3NF – brak redundancji i zależności przechodnich.
2. **UUID**: Użycie losowych UUID zapobiega hot-spottingowi i ułatwia skalowanie.
3. **Brak tabel spaced-repetition**: stan powtórek przechowywany będzie po stronie klienta/algorytmu zewnętrznego zgodnie z decyzjami MVP.
4. **Walidacje długości tekstu**: dodatkowo enforce’owane na poziomie logiki aplikacji oraz na warstwie backend.
5. **Rozszerzalność**: struktura ułatwia dodanie w przyszłości m.in. talii (decks), historii powtórek czy logów błędów AI.

