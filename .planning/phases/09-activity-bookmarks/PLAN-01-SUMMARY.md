# Plan 01 Summary: Bookmarks — save, dashboard, and notification

## Status: Complete

## What Was Built

### 1. Bookmarks table and migration (`supabase/migrations/00010_bookmarks.sql`)
- `bookmarks` table with composite primary key `(user_id, question_id)`
- CASCADE deletes on both user and question foreign keys
- Three RLS policies: SELECT, INSERT, DELETE — all scoped to `auth.uid() = user_id`
- Index on `user_id` for efficient dashboard queries
- Updated `email_preferences` column default to include `bookmark_live: true`
- Backfilled all existing profiles with `bookmark_live: true` preference

### 2. Toggle bookmark Server Action (`src/app/actions/bookmarks.js`)
- `toggleBookmark(questionId)` — checks existence, then inserts or deletes
- Auth check, duplicate key race condition handling
- Revalidates `/dashboard` and `/questions/upcoming` on change

### 3. BookmarkButton client component (`src/components/BookmarkButton.jsx`)
- Optimistic UI with `useOptimistic` for instant fill/unfill feedback
- `useTransition` for non-blocking async toggle
- Amber color when bookmarked, warm-400 when not (consistent with design system)
- SVG bookmark icon: outlined when unsaved, filled when saved
- Compact display: icon + "Save" / "Saved" text label

### 4. Bookmark button on upcoming and question pages
- **`src/app/questions/upcoming/page.jsx`**: Fetches user's bookmarks for displayed questions, shows BookmarkButton on each card
- **`src/app/q/[slug]/page.jsx`**: Fetches bookmark state for the question, shows BookmarkButton next to ShareButton (authenticated users only)

### 5. Saved Questions dashboard section (`src/app/dashboard/page.jsx`)
- Fetches all user bookmarks with joined question data, ordered by bookmark date (newest first)
- Displays category, publish date, "Upcoming" badge for future questions
- Links to correct page: upcoming questions link to `/questions/upcoming`, published ones to `/q/[slug]`
- Each row has a BookmarkButton (pre-set to bookmarked) for easy removal

### 6. Bookmark-goes-live email notification
- **`src/app/api/cron/daily-emails/route.js`**: New "Bookmark Goes Live" email section after daily question, before budget reset. Queries bookmarks for today's question, sends personalized email with question card and "Answer now" CTA. Respects `bookmark_live` email preference. Includes unsubscribe link.
- **`src/components/EmailPreferencesForm.jsx`**: Added `bookmark_live` toggle — "Bookmark alerts: When a question you saved goes live and is ready to answer"
- **`src/app/actions/profile.js`**: Added `bookmark_live` to `updateEmailPreferences` preferences object

## Files Created (3)
- `supabase/migrations/00010_bookmarks.sql`
- `src/app/actions/bookmarks.js`
- `src/components/BookmarkButton.jsx`

## Files Modified (5)
- `src/app/questions/upcoming/page.jsx`
- `src/app/q/[slug]/page.jsx`
- `src/app/dashboard/page.jsx`
- `src/app/api/cron/daily-emails/route.js`
- `src/components/EmailPreferencesForm.jsx`
- `src/app/actions/profile.js`

## Requirements Covered
- **ACTV-01**: Bookmark toggle on upcoming queue and question detail pages
- **ACTV-02**: Saved Questions section on dashboard
- **ACTV-03**: Email notification when bookmarked question goes live

## Build Verification
- `npm run build` passes with no errors
