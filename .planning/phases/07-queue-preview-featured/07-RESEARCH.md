# Phase 7 Research: Queue Preview & Featured Answers

## Current State

### Questions Table & RLS
- `questions` table: id, body, slug, category, publish_date, status, created_by, created_at, updated_at
- Status enum: 'draft', 'scheduled', 'published'
- Public RLS policy: `publish_date <= CURRENT_DATE AND status IN ('scheduled', 'published')` — **future questions invisible to non-admins**
- Admin policy: admins see all questions (drafts, scheduled, published)
- Questions with future `publish_date` exist in DB but are gated by RLS

### Answers Table & RLS
- `answers` table: id, expert_id, question_id, body, word_count, hidden_at, hidden_by, created_at, updated_at
- Public read policy: `hidden_at IS NULL` (visible answers only)
- Admin read policy: admins can read all answers (including hidden)
- Admin update policy: admins can update any answer (used for hidden_at toggle)
- Expert update policy: experts can update own visible answers

### Profiles Table
- Columns: id, handle, display_name, bio, avatar_url, linkedin_url, headline, organization, role, answer_limit, created_at, updated_at
- No `queue_preview_days` column yet — needs migration
- `answer_limit` (default 3) is the existing per-user configurable column pattern

### Header Navigation
- `src/components/Header.jsx`: Server Component with "Ethos" logo, "Archive" link → /questions, HeaderAuth (auth buttons + budget pill)
- Adding an "Upcoming" link for authenticated users is straightforward — conditionally render based on `user` existence

### Questions Archive Page
- `src/app/questions/page.jsx`: Lists past questions with answer counts
- Queries: `publish_date <= today, status IN ('scheduled', 'published'), ordered by publish_date DESC`
- Uses `QuestionCard` component (shows category, body, date, answer count)

### Admin Answers Page
- `src/app/admin/answers/page.jsx`: Lists all answers with ToggleHideButton
- Selects: id, body, word_count, created_at, hidden_at, hidden_by, profiles, questions
- Pattern for toggle: `ToggleHideButton` client component calls `toggleAnswerVisibility` Server Action
- **Same pattern reusable for ToggleFeatureButton**

### Hidden Answer Pattern (template for featured)
- Migration 00005: Added `hidden_at TIMESTAMPTZ` + `hidden_by UUID REFERENCES profiles(id)`
- Server Action `toggleAnswerVisibility` in `actions/answers.js`: admin check → toggle hidden_at/hidden_by → revalidate
- Client component `ToggleHideButton`: pending state, calls action, router.refresh()
- **Featured will follow identical pattern: featured_at/featured_by columns, toggle action, button component**

### AnswerCard & EditableAnswerCard
- `AnswerCard.jsx`: Server-compatible component used on homepage. Shows expert info, markdown body, word count, link.
- `EditableAnswerCard.jsx`: Client component used on q/[slug] and answers/[id]. Same layout + edit mode.
- Both need featured badge. AnswerCard needs a `featured` prop; EditableAnswerCard needs it too.

### Question Detail Page (q/[slug])
- Answers sorted by `created_at DESC` — needs to change to featured-first, then created_at DESC
- Already passes `answer.profiles` to EditableAnswerCard
- Answer query selects `*` from answers — will automatically include featured_at once column exists

## Key Decisions

### Queue Preview: RLS vs. Admin Client
- **Decision: New RLS policy** — add a policy allowing authenticated users to SELECT questions with `publish_date > CURRENT_DATE AND publish_date <= CURRENT_DATE + 7 days`
- Application layer further filters by user's `queue_preview_days` (default 3, max 7)
- Avoids service role key usage. RLS policies are OR'd, so new policy doesn't interfere with existing one.

### Queue Preview Depth
- New column `queue_preview_days INTEGER NOT NULL DEFAULT 3` on profiles
- RLS caps at 7 days (hardcoded in policy for safety)
- Application code reads user's preference and filters accordingly
- Future: premium tiers could get 7 days; free users get 3

### Featured: One Per Question
- **UNIQUE partial index:** `CREATE UNIQUE INDEX ON answers (question_id) WHERE featured_at IS NOT NULL`
- Enforced at DB level — prevents race conditions
- Server Action: when featuring answer A for question Q, clear existing featured answer for Q first, then set A

### Featured Badge Display
- FEAT-02 says "in all feeds" — badge on AnswerCard (homepage) + EditableAnswerCard (question page, answer detail)
- FEAT-03 says "first in answer list on question pages" — sort on q/[slug] only
- Homepage keeps created_at DESC order (featured badge still visible, just not sorted first)

### Upcoming Questions: No Answers Shown
- QUEV-03: "show publish date and category but not other experts' answers"
- The page doesn't query answers at all — just questions
- No answer count shown (meaningless for future questions since they shouldn't have answers yet)

## Plan Structure

| Plan | Wave | Requirements | Files Modified |
|------|------|-------------|----------------|
| 01 | 1 | QUEV-01, QUEV-02, QUEV-03, QUEV-04 | new migration, new page, Header.jsx |
| 02 | 1 | FEAT-01, FEAT-02, FEAT-03, FEAT-04 | new migration, actions/answers.js, new component, admin/answers page, AnswerCard.jsx, EditableAnswerCard.jsx, q/[slug]/page.jsx |

Plans 01 and 02 in parallel (Wave 1). No file overlap — Plan 01 touches profiles/questions, Plan 02 touches answers/admin.
