-- migration: create_generations_and_flashcards
-- purpose: introduce core domain tables `generations` and `flashcards` along with
--          supporting enum, indexes and row-level security (rls) policies.
-- touched objects:
--   * type  : source_enum
--   * tables: generations, flashcards
--   * indexes: idx_generations_user_id_created_at, idx_flashcards_user_id_created_at,
--              idx_flashcards_generation_id
--   * rls   : enabled on both tables with granular policies per supabase role
-- special notes:
--   * all sql is intentionally lower-case to satisfy project style-guide
--   * destructive statements (none in this migration) would be preceded by loud comments
--   * we explicitly create policies for both `anon` and `authenticated` roles; absence of
--     a policy would implicitly deny access, but explicit denial makes intent obvious
--   * extension pgcrypto is required for gen_random_uuid(); enable if missing

--------------------------------------------------------------------------------
-- 0. prerequisites
--------------------------------------------------------------------------------
-- ensure the pgcrypto extension is available for gen_random_uuid()
create extension if not exists pgcrypto;

--------------------------------------------------------------------------------
-- 1. enumerated types
--------------------------------------------------------------------------------
-- source_enum defines the origin of a flashcard; may be extended later
do $$
begin
    -- create enum only if it does not already exist
    if not exists (
        select 1 from pg_type where typname = 'source_enum'
    ) then
        create type source_enum as enum ('ai_generated', 'ai_edited', 'manual');
    end if;
end
$$;

--------------------------------------------------------------------------------
-- 2. table: generations
--------------------------------------------------------------------------------
create table if not exists generations (
    id                    uuid primary key default gen_random_uuid(),
    user_id               uuid not null references auth.users(id) on delete cascade,
    hash                  text not null,
    input_length          integer not null check (input_length between 1000 and 10000),
    generation_time_ms    integer not null check (generation_time_ms > 0),
    generated_count       smallint not null check (generated_count >= 0),
    accepted_count        smallint not null check (accepted_count >= 0),
    accepted_edited_count smallint not null check (accepted_edited_count >= 0),
    model_name            varchar(64) not null,
    created_at            timestamptz default now(),
    updated_at            timestamptz
);

-- index to quickly list a user's generations sorted by recency
create index if not exists idx_generations_user_id_created_at
    on generations (user_id, created_at desc);

-- activate row level security (rls) ASAP – policies follow in section 4
alter table generations enable row level security;

--------------------------------------------------------------------------------
-- 3. table: flashcards
--------------------------------------------------------------------------------
create table if not exists flashcards (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    generation_id   uuid references generations(id) on delete cascade,
    front           varchar(200) not null check (char_length(front) <= 200),
    back            varchar(500) not null check (char_length(back) <= 500),
    source          source_enum not null,
    created_at      timestamptz default now(),
    updated_at      timestamptz
);

-- indexes supporting common query patterns
create index if not exists idx_flashcards_user_id_created_at
    on flashcards (user_id, created_at desc);
create index if not exists idx_flashcards_generation_id
    on flashcards (generation_id);

--------------------------------------------------------------------------------
-- 3.1. trigger to keep `updated_at` current
--------------------------------------------------------------------------------
-- a single, reusable trigger function that stamps the `updated_at` column on update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- attach the trigger to each table that has an `updated_at` column
drop trigger if exists trg_generations_set_updated_at on generations;
create trigger trg_generations_set_updated_at
    before update on generations
    for each row execute function public.set_updated_at();

drop trigger if exists trg_flashcards_set_updated_at on flashcards;
create trigger trg_flashcards_set_updated_at
    before update on flashcards
    for each row execute function public.set_updated_at();

-- enable rls up-front; policies defined next
alter table flashcards enable row level security;

--------------------------------------------------------------------------------
-- 4. rls policies – generations
--------------------------------------------------------------------------------
-- note: we purposefully create separate policies for each action and role to keep
--       access rules explicit, auditable and easy to evolve.

-- 4.1 select
drop policy if exists generations_select_authenticated on generations;
create policy generations_select_authenticated
    on generations for select to authenticated
    using (user_id = auth.uid());

drop policy if exists generations_select_anon on generations;
create policy generations_select_anon
    on generations for select to anon
    using (false);

-- 4.2 insert
drop policy if exists generations_insert_authenticated on generations;
create policy generations_insert_authenticated
    on generations for insert to authenticated
    with check (user_id = auth.uid());

drop policy if exists generations_insert_anon on generations;
create policy generations_insert_anon
    on generations for insert to anon
    with check (false);

-- 4.3 update
drop policy if exists generations_update_authenticated on generations;
create policy generations_update_authenticated
    on generations for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists generations_update_anon on generations;
create policy generations_update_anon
    on generations for update to anon
    using (false)
    with check (false);

-- 4.4 delete
drop policy if exists generations_delete_authenticated on generations;
create policy generations_delete_authenticated
    on generations for delete to authenticated
    using (user_id = auth.uid());

drop policy if exists generations_delete_anon on generations;
create policy generations_delete_anon
    on generations for delete to anon
    using (false);

--------------------------------------------------------------------------------
-- 5. rls policies – flashcards
--------------------------------------------------------------------------------
-- 5.1 select
drop policy if exists flashcards_select_authenticated on flashcards;
create policy flashcards_select_authenticated
    on flashcards for select to authenticated
    using (user_id = auth.uid());

drop policy if exists flashcards_select_anon on flashcards;
create policy flashcards_select_anon
    on flashcards for select to anon
    using (false);

-- 5.2 insert
drop policy if exists flashcards_insert_authenticated on flashcards;
create policy flashcards_insert_authenticated
    on flashcards for insert to authenticated
    with check (user_id = auth.uid());

drop policy if exists flashcards_insert_anon on flashcards;
create policy flashcards_insert_anon
    on flashcards for insert to anon
    with check (false);

-- 5.3 update
drop policy if exists flashcards_update_authenticated on flashcards;
create policy flashcards_update_authenticated
    on flashcards for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

drop policy if exists flashcards_update_anon on flashcards;
create policy flashcards_update_anon
    on flashcards for update to anon
    using (false)
    with check (false);

-- 5.4 delete
drop policy if exists flashcards_delete_authenticated on flashcards;
create policy flashcards_delete_authenticated
    on flashcards for delete to authenticated
    using (user_id = auth.uid());

drop policy if exists flashcards_delete_anon on flashcards;
create policy flashcards_delete_anon
    on flashcards for delete to anon
    using (false);

--------------------------------------------------------------------------------
-- 6. admin convenience (optional)
--------------------------------------------------------------------------------
-- many supabase projects rely on the built-in `service_role` to bypass rls.  if you
-- prefer a separate `admin` role, ensure it exists first — otherwise this code is
-- harmlessly skipped.

do $$
declare
    db_name text := current_database();
begin
    if exists (select 1 from pg_roles where rolname = 'admin') then
        comment on role admin is 'application administrator with bypassrls';
        -- grant must reference the database name literally; use dynamic sql
        execute format('grant bypassrls on database %I to admin', db_name);
    end if;
end
$$;

-- end of migration

