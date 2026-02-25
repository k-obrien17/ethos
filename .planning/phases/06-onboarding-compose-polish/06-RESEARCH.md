# Phase 6 Research: Onboarding & Compose Polish

## Current State

### Auth Flow
- Login page (`src/app/login/page.jsx`): Two OAuth buttons (Google, LinkedIn), no onboarding
- Auth callback (`src/app/auth/callback/route.js`): Exchanges code → redirects to `/` or `next` param
- Profile auto-created by `handle_new_user()` trigger with display_name, avatar_url, auto-generated handle
- **No welcome screen, no profile completion prompt, no new-user detection**

### Profile Completeness
- `profiles` table has: display_name, handle (auto-set), avatar_url (from OAuth), headline (null), bio (null), organization (null)
- New users have headline=null, bio=null, organization=null
- **Detection strategy:** Profile with `headline IS NULL` = incomplete → redirect to /welcome
- No migration needed — headline already exists from migration 00004

### AnswerForm
- `src/components/AnswerForm.jsx`: Plain textarea, word count, draft auto-save (localStorage, 500ms debounce)
- Uses `useActionState(submitAnswer, null)` for form submission
- `react-markdown` already installed (used in AnswerCard.jsx)
- Markdown rendering styles defined inline on AnswerCard: `[&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:text-warm-700 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mb-1`
- **Adding preview:** Toggle button + ReactMarkdown + shared styles. No new dependencies.

### Answer Editing
- Answers are currently immutable after submission
- RLS policy "Users can update own visible answers" already exists (00005): `USING (auth.uid() = expert_id AND hidden_at IS NULL)`
- `submit_answer()` function inserts via SECURITY DEFINER — but UPDATE goes through regular RLS
- **Edit approach:** New `editAnswer` Server Action that checks `created_at + 15 min > now()`
- No schema change needed — body and word_count already updatable via existing RLS
- Consider adding `edited_at` column to track edits (optional, nice-to-have)

### Dashboard
- `src/app/dashboard/page.jsx`: Shows profile header, stats grid, edit form, delete section
- No first-answer nudge currently
- Checks `totalAnswers` count — can use this to show nudge when 0

### Homepage
- `src/app/page.jsx`: Shows today's question + answers + recent questions
- Fetches user auth status implicitly via supabase (but doesn't use it for UI beyond AnswerForm on /q/[slug])
- **Nudge approach:** Check if user is authenticated + has 0 answers → show prompt

## Plan Structure

| Plan | Wave | Requirements | Files Modified |
|------|------|-------------|----------------|
| 01 | 1 | ONBR-01, ONBR-02 | auth/callback/route.js, new /welcome/page.jsx, dashboard/page.jsx, page.jsx |
| 02 | 1 | ONBR-03 | AnswerForm.jsx |
| 03 | 2 | ONBR-04, ONBR-05 | actions/answers.js, AnswerCard.jsx, q/[slug]/page.jsx, answers/[id]/page.jsx |

Plans 01 and 02 in parallel (no file overlap). Plan 03 in Wave 2 (edit form reuses Markdown preview pattern from Plan 02).

## Key Decisions

- **New-user detection:** Check `headline IS NULL` in auth callback — no migration needed
- **Welcome page vs. modal:** Dedicated /welcome page (not modal) — clearer UX, proper URL
- **Edit window:** 15 minutes, server-enforced via `created_at` comparison in Server Action
- **No `edited_at` column for v2:** Show "Edited" label only if we add the column. Skip for now to keep scope small — can add in future if users request edit history visibility.
- **Markdown preview:** Toggle-based (Write/Preview tabs), not side-by-side split — works better on mobile
