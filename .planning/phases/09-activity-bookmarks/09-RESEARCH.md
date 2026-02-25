# Phase 9 Research: Activity & Bookmarks

## Current State

### Database Schema
- **9 migrations** so far (00001–00009)
- Next migrations: `00010_bookmarks.sql` and `00011_answer_view_counts.sql`
- Profiles table already has: id, handle, display_name, bio, avatar_url, linkedin_url, headline, organization, role, answer_limit, queue_preview_days, email_preferences (JSONB), unsubscribe_token, created_at, updated_at
- Answers table has: id, expert_id, question_id, body, word_count, hidden_at, hidden_by, featured_at, featured_by, created_at, updated_at
- Questions table has: id, body, slug, category, publish_date, status, created_by, created_at

### Upcoming Questions Page (`src/app/questions/upcoming/page.jsx`)
- Server Component, auth-gated (redirects to /login)
- Queries questions with `publish_date > today` within user's `queue_preview_days` window
- Renders: category badge, publish date, question body
- **No bookmark button currently** — each question card is a simple `<div>` (not interactive)
- Bookmark button needs to go on each question card here

### Question Detail Page (`src/app/q/[slug]/page.jsx`)
- Server Component with client-side AnswerForm
- Shows question body, date, category, answer form, and answers
- **Bookmark button should appear** near the question header (next to ShareButton)
- Already has user auth check for answer form — can reuse `user` for bookmark state

### Dashboard (`src/app/dashboard/page.jsx`)
- Sections: profile header, stats grid, budget remaining, first-answer nudge, notification preferences, edit profile, delete account
- **"Saved Questions" section needed** — logically goes after stats/budget, before notification preferences
- Already fetches user profile and monthly stats

### Expert Profile Page (`src/app/expert/[handle]/page.jsx`)
- Shows total answers, monthly count, selectivity
- Answer archive with question context, markdown rendering, word count
- **View counts would appear per-answer** in the footer (where word count already is)
- Currently: `{answer.word_count} words` — view count goes alongside

### Answer Detail Page (`src/app/answers/[id]/page.jsx`)
- Shows single answer with question context
- `revalidate = 3600` (ISR every hour)
- **View count tracking via API route** — increment on page load via client-side fetch

### Email Infrastructure (Phase 8)
- `src/lib/email.js` — sendEmail, emailLayout, getUnsubscribeUrl
- `src/app/api/cron/daily-emails/route.js` — daily cron at 9 AM UTC
- Email preferences JSONB on profiles: daily_question, weekly_recap, budget_reset, featured_answer
- **Bookmark notification** needs a new preference key: `bookmark_live`

### Existing Server Actions
- `src/app/actions/answers.js` — submitAnswer, editAnswer, toggleAnswerVisibility, toggleFeaturedAnswer
- `src/app/actions/profile.js` — updateProfile, deleteAccount, updateEmailPreferences
- **New file needed:** `src/app/actions/bookmarks.js` — toggleBookmark

### Middleware
- `src/middleware.js` — Supabase session refresh only
- View count tracking better as API route than middleware (middleware runs on every route)

## Key Decisions

### Bookmarks Table Design
- **Decision:** Dedicated `bookmarks` table with composite unique constraint
- Schema: `user_id UUID REFERENCES auth.users ON DELETE CASCADE, question_id UUID REFERENCES questions ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT now()`
- Composite UNIQUE on `(user_id, question_id)` — one bookmark per user per question
- RLS: users can SELECT/INSERT/DELETE their own bookmarks only
- Admins don't need special access — bookmarks are personal

### Bookmark UI: Client Component with Server Action
- **Decision:** Small `BookmarkButton` client component using `useTransition` for optimistic toggle
- Server Action `toggleBookmark(questionId)` in `src/app/actions/bookmarks.js`
- Button appears on both `/questions/upcoming` and `/q/[slug]` pages
- Simple bookmark icon (outline = not bookmarked, filled = bookmarked)
- Only visible to authenticated users

### Bookmark Notification: Integrate into Daily Cron
- **Decision:** Add bookmark notification check to existing daily cron route (not a new cron)
- Each morning, check if any bookmarked questions went live today
- Send email to bookmark owners with `bookmark_live` preference enabled
- Add `bookmark_live: true` to email_preferences JSONB default
- Migration must update default AND backfill existing profiles
- Add toggle to EmailPreferencesForm

### View Count: API Route + Column on Answers
- **Decision:** `view_count INTEGER NOT NULL DEFAULT 0` on answers table
- API route `POST /api/answers/[id]/view` increments counter
- Uses admin client (RLS would block anonymous views)
- Called from client-side `useEffect` on answer detail page
- No deduplication for beta (simple counter is fine at 5-20 users)
- Publicly accessible endpoint (anonymous views should count too)
- View count visible ONLY to answer author on dashboard — not on public pages

### Dashboard "Saved Questions" Section
- **Decision:** Fetch user's bookmarks joined with questions, show as a list
- Sort by question publish_date (soonest first for upcoming, most recent first for past)
- Separate upcoming bookmarks (not yet published) from past bookmarks (already published)
- Link each to its question page
- "Remove" button (or unbookmark on click) for managing saved items

## Plan Structure

| Plan | Wave | Requirements | Files Modified |
|------|------|-------------|----------------|
| 01 | 1 | ACTV-01, ACTV-02, ACTV-03 | migration, bookmarks.js (action), BookmarkButton.jsx, questions/upcoming/page.jsx, q/[slug]/page.jsx, dashboard/page.jsx, daily-emails/route.js, EmailPreferencesForm.jsx, actions/profile.js |
| 02 | 1 | ACTV-04 | migration (same file), api/answers/[id]/view/route.js, answers/[id]/page.jsx, dashboard/page.jsx, expert/[handle]/page.jsx |

Both plans in Wave 1 (parallel). Plan 01 handles bookmarks (new table + UI + notification). Plan 02 handles view counts (column + API route + display). No file overlap — Plan 01 touches `dashboard/page.jsx` for saved section, Plan 02 touches `dashboard/page.jsx` for view counts display.

**File overlap concern:** Both plans modify `dashboard/page.jsx` and share the migration file. Options:
1. **Separate migrations** (00010 for bookmarks, 00011 for view counts) — eliminates migration overlap
2. **Sequential wave** — Plan 02 in Wave 2 after Plan 01

**Decision:** Use separate migrations (00010, 00011) and separate dashboard sections. Plan 01 adds "Saved Questions" section. Plan 02 adds view count to the existing stats or a new "Your Answers" section. Since they modify different sections of dashboard/page.jsx, Wave 1 parallel is viable — but to be safe, put them in **Wave 1 and Wave 2** since dashboard is a shared file.
