---
phase: 3
plan: "01"
title: "Database migration — add headline and organization profile fields"
wave: 1
depends_on: []
requirements: ["PROF-02"]
files_modified:
  - "supabase/migrations/00004_profile_fields.sql"
autonomous: true
estimated_tasks: 2
---

# Plan 01: Database migration — add headline and organization profile fields

## Objective

Add `headline` and `organization` columns to the `profiles` table so experts can describe their role and company. These fields are required for the profile editing UI (Plan 03) and display on the public profile page (Plan 02). The migration is a simple `ALTER TABLE ADD COLUMN` with no data backfill needed.

## must_haves

- `profiles.headline` column exists (TEXT, nullable)
- `profiles.organization` column exists (TEXT, nullable)
- Existing profiles are unaffected (no NOT NULL, no default overwrite)
- Migration runs cleanly via `npx supabase db reset`
- No RLS policy changes (existing UPDATE policy already covers new columns)

## Tasks

<task id="1" title="Create profile fields migration">
Create `supabase/migrations/00004_profile_fields.sql`:

```sql
-- ============================================================
-- Add headline and organization fields to profiles
-- ============================================================
-- These fields allow experts to describe their role and company.
-- Both are nullable — existing profiles are unaffected.

ALTER TABLE public.profiles
  ADD COLUMN headline TEXT,
  ADD COLUMN organization TEXT;
```

This is a non-breaking change. The existing RLS UPDATE policy (`auth.uid() = id`) already covers all profile columns, so no policy changes are needed. The `update_updated_at` trigger on profiles will automatically update `updated_at` when these fields are edited.
</task>

<task id="2" title="Verify migration" depends_on="1">
Verify the migration file exists and the SQL syntax is correct. If local Supabase is running:

```bash
npx supabase db reset
```

Verify in Supabase Studio:
- `profiles` table has `headline` and `organization` columns
- Both are nullable TEXT
- Existing profile rows have NULL for both new columns
- Updating a profile row with new field values works

If Docker is not available, verify SQL syntax by inspection — this is a straightforward `ALTER TABLE ADD COLUMN`.
</task>

## Verification

- [ ] `supabase/migrations/00004_profile_fields.sql` exists
- [ ] Migration adds `headline` (TEXT, nullable) to profiles
- [ ] Migration adds `organization` (TEXT, nullable) to profiles
- [ ] Existing profiles are unaffected (NULL values for new columns)
- [ ] No RLS policy changes needed (confirmed)
