# Plan 02 Summary: Answer view counts — tracking and author-only display

## Status: Complete

## What was built

### Task 1: Migration — add view_count to answers
- **File:** `supabase/migrations/00011_answer_view_counts.sql`
- Added `view_count INTEGER NOT NULL DEFAULT 0` column to the `answers` table
- Created `increment_view_count(answer_id UUID)` RPC function with `SECURITY DEFINER` for atomic increment (bypasses RLS, no read-then-write race)

### Task 2: View count API route
- **File:** `src/app/api/answers/[id]/view/route.js`
- POST route that calls the `increment_view_count` RPC via the admin (service role) client
- No authentication required — any page view (including anonymous) is counted
- Returns `{ success: true }` on success, appropriate error responses on failure

### Task 3: ViewTracker client component + answer page integration
- **New file:** `src/components/ViewTracker.jsx` — client component that fires a POST to the view count API on mount, returns null (renders nothing), fire-and-forget with swallowed errors
- **Modified:** `src/app/answers/[id]/page.jsx` — imported and rendered `<ViewTracker answerId={id} />` after the share/link section

### Task 4: Dashboard Total Views stat card
- **Modified:** `src/app/dashboard/page.jsx`
  - Added query to fetch user's answers with `view_count` field
  - Computed `totalViews` by reducing across all user answers
  - Added 4th stat card "Total Views" to the stats grid
  - Changed grid from `sm:grid-cols-3` to `sm:grid-cols-4`

## Key decisions
- View counts are author-only — visible on dashboard, NOT on public expert profile pages
- ViewTracker is fire-and-forget: errors in view tracking never affect page rendering
- Atomic increment via SQL function prevents race conditions
- No index on `view_count` — only queried as part of existing answer fetches

## Verification
- `npm run build` succeeds
- Route `/api/answers/[id]/view` appears in build output
- No TypeScript, warm stone palette, JS/JSX only conventions followed

## Requirements addressed
- ACTV-04: Answer view counts — column, RPC, API route, dashboard stat
