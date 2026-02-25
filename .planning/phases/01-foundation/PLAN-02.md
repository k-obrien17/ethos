---
phase: 1
plan: "02"
title: "Database schema, RLS policies, and Supabase setup"
wave: 1
depends_on: []
requirements: ["INFR-02", "PROF-01"]
files_modified:
  - "supabase/config.toml"
  - "supabase/migrations/00001_initial_schema.sql"
  - "supabase/migrations/00002_rls_policies.sql"
  - "supabase/seed.sql"
autonomous: true
estimated_tasks: 5
---

# Plan 02: Database schema, RLS policies, and Supabase setup

## Objective

Initialize Supabase CLI tooling, create the core database schema (profiles, questions, answers), write RLS policies with default-deny posture, set up the `handle_new_user` trigger for profile auto-creation on signup, and check all migration files into the repo. This plan can execute in parallel with Plan 01 since it only produces SQL migration files and Supabase configuration.

## must_haves

- Supabase CLI initialized with `supabase/config.toml` in repo
- `profiles`, `questions`, `answers` tables created via migration SQL
- `answer_limit` column on `profiles` with default 3
- `handle_new_user` trigger auto-creates profile row on auth signup with display name, avatar, and generated handle from OAuth metadata
- `updated_at` auto-update triggers on all three tables
- RLS enabled on all three tables with default-deny (no policies = no access)
- RLS policies: public read on profiles/answers, publish-date-filtered read on questions, owner-scoped writes, admin full access on questions
- Unique constraints: `answers(expert_id, question_id)`, `profiles(handle)`, `questions(slug)`
- Performance indexes for feed queries and monthly limit checks
- `supabase db reset` runs cleanly against a local Supabase instance
- Migration files checked into `supabase/migrations/`

## Tasks

<task id="1" title="Initialize Supabase CLI and project">
Install the Supabase CLI and initialize the project directory structure.

```bash
npm install -D supabase
npx supabase init
```

This creates `supabase/config.toml` and the `supabase/migrations/` directory.

Verify: `supabase/config.toml` exists in the repo root. The `supabase/migrations/` directory is empty and ready for migration files.

Note: This task creates the CLI scaffolding only. Creating the actual Supabase cloud project and obtaining API keys is a manual step done in the Supabase dashboard — those keys get added to `.env.local` (from Plan 01) and the Vercel dashboard.
</task>

<task id="2" title="Create initial schema migration" depends_on="1">
Create `supabase/migrations/00001_initial_schema.sql` with the exact SQL from 01-RESEARCH.md Section 2.8. This migration creates:

**Profiles table:**
- `id` UUID PK referencing `auth.users(id)` ON DELETE CASCADE
- `handle` TEXT UNIQUE NOT NULL
- `display_name` TEXT NOT NULL
- `bio` TEXT (nullable)
- `avatar_url` TEXT (nullable)
- `linkedin_url` TEXT (nullable)
- `role` TEXT NOT NULL DEFAULT 'user' CHECK ('user', 'admin')
- `answer_limit` INTEGER NOT NULL DEFAULT 3
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**Questions table:**
- `id` UUID PK DEFAULT gen_random_uuid()
- `body` TEXT NOT NULL
- `slug` TEXT UNIQUE NOT NULL
- `category` TEXT (nullable)
- `publish_date` DATE (nullable)
- `status` TEXT NOT NULL DEFAULT 'draft' CHECK ('draft', 'scheduled', 'published')
- `created_by` UUID REFERENCES profiles(id)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**Answers table:**
- `id` UUID PK DEFAULT gen_random_uuid()
- `expert_id` UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
- `question_id` UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE
- `body` TEXT NOT NULL
- `word_count` INTEGER NOT NULL DEFAULT 0
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

**Unique constraints and indexes:**
- `CREATE UNIQUE INDEX idx_answers_expert_question ON answers (expert_id, question_id)`
- Lookup indexes on `profiles(handle)`, `questions(slug)`
- Performance indexes: `questions(publish_date DESC)` filtered, `answers(question_id, created_at DESC)`, `answers(expert_id, created_at DESC)`, `answers(expert_id, created_at)` for monthly limit

**Triggers:**
- `handle_new_user()` — SECURITY DEFINER with `SET search_path = ''`. Extracts `display_name` from `raw_user_meta_data` (tries `full_name`, then `name`, then email prefix). Extracts `avatar_url` from `raw_user_meta_data` (tries `avatar_url`, then `picture`). Generates `handle` from name (lowercase, hyphens, no special chars) with random 4-char UUID suffix for uniqueness. Fires AFTER INSERT ON `auth.users`.
- `update_updated_at()` — Generic trigger function for auto-updating `updated_at`. Applied to all three tables.

Use the exact SQL from 01-RESEARCH.md Section 2.8. Key details:
- `SECURITY DEFINER` on `handle_new_user` is required because the trigger fires in Supabase Auth context which cannot write to `profiles` under RLS
- `SET search_path = ''` on the trigger function prevents search path manipulation — all table references must be fully qualified (`public.profiles`)
- The handle generation appends a random suffix (`-a3f2`) to avoid collisions between users with the same name
</task>

<task id="3" title="Create RLS policies migration" depends_on="2">
Create `supabase/migrations/00002_rls_policies.sql` with the exact SQL from 01-RESEARCH.md Section 2.9.

**Enable RLS (default deny):**
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
```

**Profiles policies:**
- `"Profiles are publicly readable"` — SELECT with `USING (true)`
- `"Users can update own profile"` — UPDATE with `USING (auth.uid() = id)` and `WITH CHECK (auth.uid() = id)`
- No INSERT policy (trigger handles creation)
- No DELETE policy (future: account deletion via server action)

**Questions policies:**
- `"Published questions are publicly readable"` — SELECT where `publish_date IS NOT NULL AND publish_date <= CURRENT_DATE AND status IN ('scheduled', 'published')`
- `"Admins can read all questions"` — SELECT checking admin role via profiles subquery
- `"Admins can insert questions"` — INSERT checking admin role
- `"Admins can update questions"` — UPDATE checking admin role
- `"Admins can delete questions"` — DELETE checking admin role

**Answers policies:**
- `"Answers are publicly readable"` — SELECT with `USING (true)`
- `"Users can insert own answers"` — INSERT with `WITH CHECK (auth.uid() = expert_id)`
- `"Users can update own answers"` — UPDATE with `USING/WITH CHECK (auth.uid() = expert_id)`
- `"Admins can delete answers"` — DELETE checking admin role (moderation)

Use the exact SQL from 01-RESEARCH.md Section 2.9. The admin role check pattern is:
```sql
EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
)
```
</task>

<task id="4" title="Create seed file for development" depends_on="2">
Create `supabase/seed.sql` with minimal seed data for local development.

This seed file should be light — just enough to verify the schema works:

```sql
-- Seed file for local development
-- Note: Profile creation happens via auth trigger, not manual insert.
-- To test, sign up via the OAuth flow in the running app.

-- Seed a few questions for testing the public feed
INSERT INTO public.questions (body, slug, category, publish_date, status) VALUES
  ('What is the most important lesson you learned this year?', 'most-important-lesson-this-year', 'Growth', CURRENT_DATE, 'published'),
  ('What would you tell your industry peers that they don''t want to hear?', 'tell-peers-dont-want-to-hear', 'Leadership', CURRENT_DATE - INTERVAL '1 day', 'published'),
  ('What skill will be most valuable in your field five years from now?', 'most-valuable-skill-five-years', 'Strategy', CURRENT_DATE + INTERVAL '1 day', 'scheduled');
```

Note: Profiles cannot be seeded directly because they reference `auth.users(id)`. The `handle_new_user` trigger creates profiles automatically when users sign up via OAuth. For admin testing, manually update a profile's role after signup:
```sql
UPDATE public.profiles SET role = 'admin' WHERE handle = '<your-handle>';
```
</task>

<task id="5" title="Verify migrations run cleanly" depends_on="3,4">
Run the local Supabase stack and verify everything works.

```bash
npx supabase start       # Start local Postgres + Auth + Studio
npx supabase db reset    # Run all migrations + seed from scratch
```

**Verify in Supabase Studio (localhost:54323):**
1. Tables `profiles`, `questions`, `answers` exist with correct columns and types
2. `answer_limit` column on `profiles` has default value 3
3. RLS is enabled on all three tables:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public' AND tablename IN ('profiles', 'questions', 'answers');
   ```
   All should show `rowsecurity = true`.
4. Seed questions appear in the `questions` table
5. Unique indexes exist:
   ```sql
   SELECT indexname, indexdef FROM pg_indexes
   WHERE tablename IN ('profiles', 'questions', 'answers');
   ```
6. Triggers exist on all three tables (check `updated_at` trigger + `on_auth_user_created`)

**Test RLS from Supabase Studio SQL editor (using anon role):**
- Can SELECT from `profiles` (public read) — returns empty set (no users yet, but no error)
- Can SELECT published questions from seed data (the one with `publish_date <= CURRENT_DATE`)
- Cannot SELECT the scheduled future question (RLS filters it out for public)
- Cannot INSERT into `profiles` directly (no INSERT policy)
- Cannot INSERT into `questions` (admin-only)

If local Supabase is not running (Docker not available), verify the SQL is syntactically valid:
```bash
npx supabase db lint
```

After verification, update `.env.local` with the local Supabase keys printed by `supabase start`:
- `NEXT_PUBLIC_SUPABASE_URL` = `http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (from supabase start output)
- `SUPABASE_SERVICE_ROLE_KEY` = (from supabase start output)
</task>

## Verification

- [ ] `supabase/config.toml` exists in repo
- [ ] `supabase/migrations/00001_initial_schema.sql` exists with profiles, questions, answers tables
- [ ] `supabase/migrations/00002_rls_policies.sql` exists with all RLS policies
- [ ] `supabase/seed.sql` exists with test questions
- [ ] `npx supabase db reset` runs without errors
- [ ] All three tables have RLS enabled (`rowsecurity = true`)
- [ ] `profiles.answer_limit` column exists with default 3
- [ ] `profiles.role` column exists with default 'user' and CHECK constraint
- [ ] `handle_new_user` trigger function exists with SECURITY DEFINER
- [ ] `on_auth_user_created` trigger is attached to `auth.users`
- [ ] `updated_at` triggers fire on all three tables
- [ ] Unique index on `answers(expert_id, question_id)` exists
- [ ] Published seed question is visible via anon SELECT; future question is not
- [ ] Direct INSERT into profiles/questions fails for anon users (RLS blocks it)
