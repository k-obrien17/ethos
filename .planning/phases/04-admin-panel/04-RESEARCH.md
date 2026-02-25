# Phase 4 Research: Admin Panel

**Date:** 2026-02-25
**Requirements:** ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06

## Current State

### Admin Infrastructure (Already Built)

- **Role system:** `profiles.role` CHECK ('user', 'admin') — default 'user'
- **Middleware:** `/admin` routes redirect unauthenticated users to `/login`, non-admin users to `/`
- **Admin layout:** `src/app/admin/layout.jsx` — server-side role check with redirect
- **Admin page:** `src/app/admin/page.jsx` — placeholder ("coming in Phase 4")
- **RLS policies (questions):** Admin can SELECT all, INSERT, UPDATE, DELETE
- **RLS policies (answers):** Admin can DELETE (for moderation), but no UPDATE policy exists

### Questions Schema

```sql
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  publish_date DATE,               -- null = unscheduled draft
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Indexes: `idx_questions_slug` (unique), `idx_questions_publish_date DESC` (partial, non-null).

### Answers Schema

```sql
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

No soft-delete columns. No visibility/hidden columns. Admin can only hard-delete via current RLS.

### Public Query Patterns

All public pages filter: `status IN ('scheduled', 'published') AND publish_date <= CURRENT_DATE`. Question detail page (`/q/[slug]`) uses `.eq('slug', slug).single()` without explicit status filter — relies on RLS.

### Server Action Conventions

- `'use server'` directive
- Auth check: `supabase.auth.getUser()`, return `{ error }` if missing
- Input extraction: `formData.get('field')?.trim()`
- Validation: check lengths, formats, return `{ error: 'message' }`
- DB operation: Supabase client queries
- Error handling: parse `error.message.includes('...')` for specific cases
- Cache: `revalidatePath()` for affected routes
- Return: `{ success: true }` or `{ error: 'message' }`

## What Needs to Be Built

### Migration (answers moderation)
- Add `hidden_at TIMESTAMPTZ` and `hidden_by UUID REFERENCES profiles(id)` to answers
- Update public read RLS to exclude hidden answers: `USING (hidden_at IS NULL)`
- Add admin UPDATE policy on answers (needed to set hidden_at/hidden_by)

### Question CRUD
- Server Actions: `createQuestion()`, `updateQuestion()`, `deleteQuestion()`
- Slug auto-generation from body text
- Status transitions: draft → scheduled (when publish_date set) → published (manual or date-based)
- Admin question list page, create page, edit page

### Queue Management
- List upcoming questions ordered by publish_date
- Change publish_date to reorder (ADMN-02)
- Queue depth indicator: how many days of scheduled questions remain
- Gap detection: missing dates in the queue

### Answer Moderation
- Admin answer list with expert name, question context
- Hide/unhide toggle (set/clear hidden_at)
- Hidden answers still exist in DB but excluded from public feeds

### Multi-Editor (ADMN-04)
- Already inherent: any user with `role = 'admin'` can access all admin features
- No additional work needed beyond documenting in verification checklist

## Technical Approach

### Slug Generation
```javascript
function generateSlug(body) {
  return body
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}
```
Admin can override; uniqueness enforced by DB constraint.

### Answer Visibility
Soft-hide via `hidden_at` column is preferable to hard-delete because:
- Admin can undo (unhide) — reversible moderation
- Expert's answer still counts toward their budget (they chose to answer)
- Audit trail preserved

### Admin Navigation
Simple top-level nav in admin layout: Questions | Answers | back to site.

## Plan Structure

| Plan | Title | Wave | Requirements |
|------|-------|------|-------------|
| 01 | Answer moderation migration | 1 | ADMN-05 (partial) |
| 02 | Question CRUD — Server Actions + UI | 1 | ADMN-01, ADMN-03 |
| 03 | Queue dashboard + scheduling | 2 | ADMN-02, ADMN-06 |
| 04 | Answer moderation UI | 2 | ADMN-05 (complete) |

ADMN-04 (multi-editor) is inherent in existing middleware + layout — verified in all plans.
