---
phase: 4
plan: "01"
title: "Answer moderation migration — hidden_at column and RLS update"
wave: 1
depends_on: []
requirements: ["ADMN-05"]
files_modified:
  - "supabase/migrations/00005_answer_moderation.sql"
autonomous: true
estimated_tasks: 2
---

# Plan 01: Answer moderation migration

## Objective

Add soft-hide infrastructure to the answers table so admins can hide published answers without deleting them. This creates the `hidden_at` and `hidden_by` columns, updates the public read RLS policy to exclude hidden answers, and adds an admin UPDATE policy on answers (currently only DELETE exists). Wave 1 — no dependencies.

## must_haves

- `hidden_at TIMESTAMPTZ` column on answers (null = visible, non-null = hidden)
- `hidden_by UUID REFERENCES profiles(id)` column on answers (tracks which admin hid it)
- Public read policy updated to exclude hidden answers (`hidden_at IS NULL`)
- Admin UPDATE policy on answers (needed to set hidden_at/hidden_by without full delete)
- Existing data unaffected (all current answers remain visible)
- Expert's own UPDATE policy tightened so they cannot clear hidden_at on their own answers

## Tasks

<task id="1" title="Create answer moderation migration">
Create `supabase/migrations/00005_answer_moderation.sql`:

```sql
-- Add soft-hide columns for answer moderation
ALTER TABLE public.answers
  ADD COLUMN hidden_at TIMESTAMPTZ,
  ADD COLUMN hidden_by UUID REFERENCES public.profiles(id);

-- Update public read policy to exclude hidden answers
DROP POLICY "Answers are publicly readable" ON public.answers;
CREATE POLICY "Visible answers are publicly readable"
  ON public.answers FOR SELECT
  USING (hidden_at IS NULL);

-- Admins can still read all answers (including hidden) for moderation
CREATE POLICY "Admins can read all answers"
  ON public.answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Tighten expert's own UPDATE policy: experts can update their own answers
-- BUT only if the answer is not hidden (prevents experts from clearing hidden_at)
DROP POLICY "Users can update own answers" ON public.answers;
CREATE POLICY "Users can update own visible answers"
  ON public.answers FOR UPDATE
  USING (auth.uid() = expert_id AND hidden_at IS NULL)
  WITH CHECK (auth.uid() = expert_id AND hidden_at IS NULL);

-- Admins can update any answer (to set/clear hidden_at)
CREATE POLICY "Admins can update answers"
  ON public.answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for filtering hidden answers efficiently
CREATE INDEX idx_answers_hidden ON public.answers (hidden_at)
  WHERE hidden_at IS NOT NULL;
```

Key details:
- Drops and recreates the public read policy (old: `USING (true)`, new: `USING (hidden_at IS NULL)`)
- Adds separate admin read policy so admins can see hidden answers in moderation UI
- **Drops and recreates expert UPDATE policy** with `hidden_at IS NULL` guard — prevents experts from modifying hidden answers (including clearing hidden_at to bypass moderation)
- Adds admin UPDATE policy (previously only DELETE existed) — admins can update any answer
- Partial index on hidden_at for efficient moderation queries
</task>

<task id="2" title="Verify migration correctness">
Review the migration SQL for:
1. No naming conflicts with existing policies
2. Correct REFERENCES to profiles(id) for hidden_by
3. Public users cannot see hidden answers
4. Admins CAN see hidden answers
5. Admins can UPDATE answers (to set hidden_at)
6. Experts can still update their own answer body
7. Index creation doesn't conflict with existing indexes
</task>

## Verification

- [ ] `hidden_at` and `hidden_by` columns added to answers table
- [ ] Public read policy excludes answers where `hidden_at IS NOT NULL`
- [ ] Admin read policy allows reading all answers including hidden
- [ ] Admin update policy allows setting hidden_at/hidden_by
- [ ] Partial index on hidden_at created for query performance
- [ ] Expert UPDATE policy tightened: experts cannot modify hidden answers (prevents moderation bypass)
- [ ] Existing answer data unaffected (all have hidden_at = NULL = visible)
