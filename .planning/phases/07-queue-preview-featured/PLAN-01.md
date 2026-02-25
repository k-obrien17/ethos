---
phase: 7
plan: "01"
title: "Queue preview for upcoming questions"
wave: 1
depends_on: []
requirements: ["QUEV-01", "QUEV-02", "QUEV-03", "QUEV-04"]
files_modified:
  - "supabase/migrations/00007_queue_preview_days.sql"
  - "src/app/questions/upcoming/page.jsx"
  - "src/components/Header.jsx"
autonomous: true
estimated_tasks: 3
---

# Plan 01: Queue preview for upcoming questions

## Objective

Let authenticated users preview upcoming questions before their publish date. A new page at `/questions/upcoming` shows the next N days of scheduled questions (date and category only, no answers). Preview depth is configurable per profile (default 3 days, max 7).

## must_haves

- Authenticated users can see upcoming questions for the next 3-7 days (QUEV-01)
- Queue preview page at /questions/upcoming requires auth, redirects to /login if not signed in (QUEV-02)
- Upcoming questions show publish date and category but no answer data (QUEV-03)
- Preview depth configurable per profile via `queue_preview_days` column (default 3) (QUEV-04)
- New RLS policy allows authenticated users to SELECT questions up to 7 days ahead
- Navigation link to "Upcoming" visible for authenticated users in Header

## Tasks

<task id="1" title="Migration: queue_preview_days + upcoming questions RLS">
Create `supabase/migrations/00007_queue_preview_days.sql`:

```sql
-- ============================================================
-- Queue preview: user-configurable preview depth + RLS
-- ============================================================
-- Adds queue_preview_days to profiles (default 3, max 7).
-- Adds RLS policy so authenticated users can see questions
-- up to 7 days ahead. Application layer filters to user's depth.

-- Add preview depth preference to profiles
ALTER TABLE public.profiles
  ADD COLUMN queue_preview_days INTEGER NOT NULL DEFAULT 3
  CONSTRAINT queue_preview_days_range CHECK (queue_preview_days BETWEEN 1 AND 7);

-- Allow authenticated users to see upcoming questions (up to 7 days)
CREATE POLICY "Authenticated users can preview upcoming questions"
  ON public.questions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND publish_date IS NOT NULL
    AND publish_date > CURRENT_DATE
    AND publish_date <= CURRENT_DATE + interval '7 days'
    AND status IN ('scheduled', 'published')
  );
```

Key details:
- `queue_preview_days` defaults to 3, constrained 1-7
- RLS policy caps at 7 days (hardcoded safety limit) — application code filters to user's actual preference
- Policies are OR'd: this doesn't interfere with the existing public read policy (which covers `publish_date <= CURRENT_DATE`)
- No index needed — small table, date range scans are fine
</task>

<task id="2" title="Create /questions/upcoming page">
Create `src/app/questions/upcoming/page.jsx` — a Server Component that requires auth:

```jsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, addDays } from 'date-fns'

export const metadata = {
  title: 'Upcoming Questions',
  description: 'Preview questions coming up this week on Ethos.',
}

export default async function UpcomingQuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's preview depth preference
  const { data: profile } = await supabase
    .from('profiles')
    .select('queue_preview_days')
    .eq('id', user.id)
    .single()

  const previewDays = profile?.queue_preview_days ?? 3
  const today = new Date().toISOString().slice(0, 10)
  const maxDate = addDays(new Date(), previewDays).toISOString().slice(0, 10)

  // Fetch upcoming questions within preview window
  // RLS allows auth'd users to see up to 7 days ahead;
  // we filter to their actual preview depth here
  const { data: questions } = await supabase
    .from('questions')
    .select('id, body, slug, category, publish_date')
    .gt('publish_date', today)
    .lte('publish_date', maxDate)
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: true })

  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-2">
        Upcoming Questions
      </h1>
      <p className="text-sm text-warm-500 mb-6">
        Preview the next {previewDays} {previewDays === 1 ? 'day' : 'days'} of questions.
      </p>

      {questions && questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-6 bg-white rounded-lg border border-warm-200"
            >
              <div className="flex items-center gap-2 mb-2">
                {q.category && (
                  <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                    {q.category}
                  </span>
                )}
                <span className="text-xs text-warm-400">
                  {format(new Date(q.publish_date), 'EEEE, MMMM d')}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-warm-900">
                {q.body}
              </h2>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-warm-500 text-sm text-center py-8">
          No upcoming questions scheduled in the next {previewDays} days.
        </p>
      )}
    </div>
  )
}
```

Key details:
- Auth gate: `redirect('/login')` if no user — satisfies QUEV-02
- No answer data fetched or displayed — satisfies QUEV-03
- Uses `queue_preview_days` from profile — satisfies QUEV-04
- Questions ordered ascending by publish_date (soonest first)
- Static card layout (not clickable/linked) — future questions don't have answer pages yet
- Shows day of week ("Wednesday, February 26") for planning context
- `date-fns` already installed (used throughout project)
</task>

<task id="3" title="Add Upcoming nav link for authenticated users">
Update `src/components/Header.jsx`:

Add an "Upcoming" link next to the existing "Archive" link, visible only when `user` is authenticated:

```jsx
// In the nav, after Archive link:
{user && (
  <Link
    href="/questions/upcoming"
    className="text-warm-600 hover:text-warm-900 text-sm font-medium"
  >
    Upcoming
  </Link>
)}
```

Place it between "Archive" and the HeaderAuth component. The `user` variable is already available from the auth check on line 7.

Full updated nav section:
```jsx
<div className="flex items-center gap-4">
  <Link
    href="/questions"
    className="text-warm-600 hover:text-warm-900 text-sm font-medium"
  >
    Archive
  </Link>
  {user && (
    <Link
      href="/questions/upcoming"
      className="text-warm-600 hover:text-warm-900 text-sm font-medium"
    >
      Upcoming
    </Link>
  )}
  <HeaderAuth user={user} budgetData={budgetData} />
</div>
```
</task>

## Verification

- [ ] Authenticated user can see upcoming questions at `/questions/upcoming`
- [ ] Unauthenticated user visiting `/questions/upcoming` is redirected to `/login`
- [ ] Upcoming questions show publish date and category only (no answer data)
- [ ] Only questions within the user's `queue_preview_days` are shown
- [ ] Default preview depth is 3 days
- [ ] Header shows "Upcoming" link for authenticated users
- [ ] Header does NOT show "Upcoming" link for anonymous visitors
- [ ] Questions with `publish_date <= today` do NOT appear on upcoming page
- [ ] Questions sorted by publish_date ascending (soonest first)
- [ ] `npm run build` succeeds
