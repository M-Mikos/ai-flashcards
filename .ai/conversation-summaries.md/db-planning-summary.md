<conversation_summary>
<decisions>
1. Flashcards table will be directly linked to users; no decks/collections in MVP.
2. Table generations will log each AI generation session with columns: hash of input text, input_length, generation_time_ms, generated_count, accepted_count, accepted_edited_count, model_name.
3. Flashcards table includes column source with ENUM('ai_generated','ai_edited','manual'); rejected suggestions are not persisted (no ai_suggestions table).
4. Column generation_id in flashcards is nullable to allow manual flashcards; FK references generations ON DELETE CASCADE.
5. No reviews table; spaced-repetition state kept in memory via external library.
6. Front ≤200 chars, back ≤500 chars; input text length validated 1 000–10 000 chars (enforced at app level).
7. Primary keys use Supabase default UUID; minimal indexing: (user_id, created_at DESC) on flashcards, PK on generations; additional indexes may be added later.
8. Multiple generations with identical hash are allowed; uniqueness is not enforced across user_id + hash.
9. RLS policy on all tables: user_id = auth.uid(); admin role with bypassrls privileges.
10. Hard deletes are used; ON DELETE CASCADE cleans related flashcards when a generation is removed. Timestamps created_at & updated_at maintained on flashcards and generations.
</decisions>

<matched_recommendations>
1. Use UUID primary keys for distributed safety (matches decision 7).
2. generation_id nullable in flashcards to accommodate manual source (decision 4).
3. Add created_at and updated_at timestamps on core tables (decision 10).
4. Keep indexing simple with (user_id, created_at DESC) on flashcards (decision 7).
5. Apply identical RLS policy user_id = auth.uid() across tables plus admin bypass (decision 9).
6. Enforce length constraints on front/back fields (decision 6).
</matched_recommendations>

<database_planning_summary>
The MVP data model comprises two user-scoped tables:

1. generations
   • id UUID PK (default)
   • user_id UUID FK to auth.users
   • hash TEXT NOT NULL
   • input_length INTEGER NOT NULL
   • generation_time_ms INTEGER NOT NULL
   • generated_count SMALLINT NOT NULL
   • accepted_count SMALLINT NOT NULL
   • accepted_edited_count SMALLINT NOT NULL
   • model_name VARCHAR(64) NOT NULL
   • created_at TIMESTAMPTZ DEFAULT now()
   • updated_at TIMESTAMPTZ

   Relationships:
   – 1 user : N generations
   – ON DELETE CASCADE from users (if allowed), cascading to flashcards.

2. flashcards
   • id UUID PK
   • user_id UUID NOT NULL FK auth.users
   • generation_id UUID FK generations NULLABLE ON DELETE CASCADE
   • front VARCHAR(200) NOT NULL CHECK (char_length(front) <= 200)
   • back VARCHAR(500) NOT NULL CHECK (char_length(back) <= 500)
   • source ENUM('ai_generated','ai_edited','manual') NOT NULL
   • created_at TIMESTAMPTZ DEFAULT now()
   • updated_at TIMESTAMPTZ

   Relationships:
   – 1 user : N flashcards
   – Optional N flashcards : 1 generation

Indexes:
   – flashcards: (user_id, created_at DESC)
   – generations: (user_id, created_at DESC)

Security & RLS:
   – Policy on both tables: user_id = auth.uid()
   – Role 'admin' granted BYPASSRLS for maintenance/analytics.

Scalability & performance:
   – UUID PKs avoid hot-spotting.
   – Minimal indexes keep write overhead low; additional indexes (e.g., source) can be added once usage patterns emerge.
   – No stateful review data stored; spaced-repetition handled client-side, so storage footprint remains small.

</database_planning_summary>

<unresolved_issues>
1. Exact size/type of generation_time_ms field (INTEGER vs INTERVAL) needs confirmation.
2. Whether generation_id in flashcards should be SET NULL or CASCADE on generation deletion (currently CASCADE chosen; verify business expectations).
3. Decide on ENUM implementation method in PostgreSQL (native enum vs CHECK constraint).
</unresolved_issues>
</conversation_summary>
