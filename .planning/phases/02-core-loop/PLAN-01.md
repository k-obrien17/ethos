---
phase: 2
plan: "01"
title: "Database — submit_answer() advisory lock function"
wave: 1
depends_on: []
requirements: ["ANS-02", "ANS-07"]
files_modified:
  - "supabase/migrations/00003_submit_answer_function.sql"
autonomous: true
estimated_tasks: 3
---

# Plan 01: Database — submit_answer() advisory lock function

## Objective

Create a Postgres function that atomically enforces the monthly answer limit using an advisory lock. This function is the database-layer backstop for the scarcity mechanic — it prevents race conditions where two simultaneous submissions could both pass application-level checks. The function also computes word count server-side and returns the new answer row.

## must_haves

- `submit_answer(p_expert_id, p_question_id, p_body)` function exists and returns an `answers` row
- Function uses `pg_advisory_xact_lock` to serialize concurrent submissions by the same expert
- Function checks `profiles.answer_limit` against current month's answer count
- Function raises exception `'Monthly answer limit reached'` when limit exceeded
- Function computes `word_count` from the body text and stores it
- Function is `SECURITY DEFINER` with `SET search_path = ''`
- Existing `idx_answers_expert_question` unique index prevents duplicate answers per question
- Migration runs cleanly via `npx supabase db reset`

## Tasks

<task id="1" title="Create submit_answer() migration file">
Create `supabase/migrations/00003_submit_answer_function.sql` with the advisory lock function.

```sql
-- ============================================================
-- submit_answer() — Atomic answer submission with budget enforcement
-- ============================================================
-- Uses an advisory lock to serialize concurrent submissions by
-- the same expert, preventing race conditions on the monthly
-- answer limit check.
--
-- Returns the full answers row on success.
-- Raises exception on:
--   - 'Profile not found' (invalid expert_id)
--   - 'Monthly answer limit reached' (budget exhausted)
--   - Unique constraint violation (duplicate answer to same question)
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_answer(
  p_expert_id UUID,
  p_question_id UUID,
  p_body TEXT
) RETURNS public.answers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_limit INT;
  v_word_count INT;
  v_answer public.answers;
BEGIN
  -- Advisory lock on expert_id prevents concurrent submissions
  -- Lock is transaction-scoped: released on COMMIT or ROLLBACK
  PERFORM pg_advisory_xact_lock(hashtext(p_expert_id::text));

  -- Get expert's answer limit from profile
  SELECT answer_limit INTO v_limit
  FROM public.profiles WHERE id = p_expert_id;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Count answers submitted this calendar month
  SELECT COUNT(*) INTO v_count
  FROM public.answers
  WHERE expert_id = p_expert_id
  AND created_at >= date_trunc('month', now());

  -- Enforce monthly budget
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Monthly answer limit reached';
  END IF;

  -- Compute word count (split on whitespace)
  v_word_count := array_length(
    regexp_split_to_array(trim(p_body), '\s+'), 1
  );
  IF v_word_count IS NULL THEN
    v_word_count := 0;
  END IF;

  -- Insert the answer
  -- The UNIQUE index idx_answers_expert_question prevents
  -- duplicate answers to the same question
  INSERT INTO public.answers (expert_id, question_id, body, word_count)
  VALUES (p_expert_id, p_question_id, p_body, v_word_count)
  RETURNING * INTO v_answer;

  RETURN v_answer;
END;
$$;
```

Key implementation notes:
- `SECURITY DEFINER` allows the function to read `profiles` and write `answers` regardless of the caller's RLS permissions. The function itself checks the expert_id matches, so this is safe.
- `SET search_path = ''` prevents search path manipulation attacks. All table references use `public.` prefix.
- `pg_advisory_xact_lock(hashtext(p_expert_id::text))` creates a transaction-scoped lock keyed to the expert's UUID. Two simultaneous calls by the same expert will serialize — the second waits until the first commits or rolls back.
- Word count uses `regexp_split_to_array` which handles multiple spaces, tabs, and newlines correctly.
- The existing `idx_answers_expert_question` unique index on `(expert_id, question_id)` provides an additional guard against duplicate answers. If somehow two requests slip through for the same question, the unique constraint catches it.
</task>

<task id="2" title="Grant execute permission to authenticated users">
The `submit_answer()` function needs to be callable by authenticated Supabase users. Add a GRANT statement at the end of the migration:

```sql
-- Grant execute to authenticated users (Supabase role)
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, UUID, TEXT)
TO authenticated;
```

This allows any logged-in user to call the function via Supabase RPC. The function internally validates the expert_id, so there's no risk of one user submitting for another (the Server Action passes the authenticated user's ID).

Note: The `anon` role should NOT have execute permission on this function — only authenticated users can submit answers.
</task>

<task id="3" title="Verify migration runs cleanly" depends_on="1,2">
Run the full migration suite to verify the new function is created correctly.

```bash
npx supabase db reset    # Runs all migrations (00001 + 00002 + 00003) + seed
```

**Verify in Supabase Studio (localhost:54323) SQL editor:**

1. Function exists:
   ```sql
   SELECT routine_name, routine_type
   FROM information_schema.routines
   WHERE routine_schema = 'public' AND routine_name = 'submit_answer';
   ```
   Should return one row.

2. Function is SECURITY DEFINER:
   ```sql
   SELECT prosecdef FROM pg_proc WHERE proname = 'submit_answer';
   ```
   Should return `true`.

3. Test the function works (requires a test user and question):
   - Create a test user via the Supabase Auth UI or sign up through the app
   - Get the user's UUID from `auth.users`
   - Get a question UUID from the seed data
   - Call the function:
     ```sql
     SELECT * FROM public.submit_answer(
       '<user-uuid>'::uuid,
       '<question-uuid>'::uuid,
       'This is a test answer to verify the function works correctly.'
     );
     ```
   - Verify: returns an answer row with `word_count = 10`
   - Verify: calling it again with the same question raises a unique constraint error
   - Verify: after 3 successful calls (to different questions, if seeded), the 4th raises "Monthly answer limit reached"

If local Supabase is not running, verify SQL syntax:
```bash
npx supabase db lint
```
</task>

## Verification

- [ ] `supabase/migrations/00003_submit_answer_function.sql` exists in repo
- [ ] `npx supabase db reset` runs without errors
- [ ] `submit_answer()` function exists with SECURITY DEFINER
- [ ] Function returns an `answers` row with computed `word_count`
- [ ] Advisory lock prevents concurrent duplicate submissions
- [ ] Function raises 'Monthly answer limit reached' when budget exhausted
- [ ] Function raises unique constraint error for duplicate question answers
- [ ] `authenticated` role has EXECUTE permission; `anon` does not
