---
phase: 9
plan: "01"
title: "Bookmarks — save, dashboard, and notification"
wave: 1
depends_on: []
requirements: ["ACTV-01", "ACTV-02", "ACTV-03"]
files_modified:
  - "supabase/migrations/00010_bookmarks.sql"
  - "src/app/actions/bookmarks.js"
  - "src/components/BookmarkButton.jsx"
  - "src/app/questions/upcoming/page.jsx"
  - "src/app/q/[slug]/page.jsx"
  - "src/app/dashboard/page.jsx"
  - "src/app/api/cron/daily-emails/route.js"
  - "src/components/EmailPreferencesForm.jsx"
  - "src/app/actions/profile.js"
autonomous: true
estimated_tasks: 6
---

# Plan 01: Bookmarks — save, dashboard, and notification

## Objective

Let authenticated users bookmark questions (from upcoming preview or published question pages) to save them for later. Bookmarked questions appear in a "Saved Questions" section on the dashboard. When a bookmarked question goes live, the user receives an email notification (integrated into the existing daily cron).

## must_haves

- `bookmarks` table with RLS — users can only see/manage their own bookmarks (ACTV-01)
- Bookmark toggle button on upcoming queue preview and question detail pages (ACTV-01)
- "Saved Questions" section on dashboard showing all bookmarked questions (ACTV-02)
- Email notification when a bookmarked question's publish_date arrives (ACTV-03)
- Bookmark notification respects `bookmark_live` email preference
- Unsubscribe link works for bookmark_live emails

## Tasks

<task id="1" title="Migration: bookmarks table and email preference update">
Create `supabase/migrations/00010_bookmarks.sql`:

```sql
-- ============================================================
-- Bookmarks table — users save questions for later
-- ============================================================

CREATE TABLE public.bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

-- RLS: users can only manage their own bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for dashboard query (user's bookmarks with question join)
CREATE INDEX idx_bookmarks_user ON public.bookmarks (user_id);

-- Add bookmark_live preference to email_preferences default
-- Update the column default for new profiles
ALTER TABLE public.profiles
  ALTER COLUMN email_preferences
  SET DEFAULT '{"daily_question":true,"weekly_recap":true,"budget_reset":true,"featured_answer":true,"bookmark_live":true}'::jsonb;

-- Backfill existing profiles with bookmark_live preference
UPDATE public.profiles
  SET email_preferences = email_preferences || '{"bookmark_live":true}'::jsonb
  WHERE NOT (email_preferences ? 'bookmark_live');
```

Key details:
- Composite primary key `(user_id, question_id)` — one bookmark per user per question
- CASCADE delete: if user or question is deleted, bookmarks are cleaned up
- Three simple RLS policies: SELECT, INSERT, DELETE — all scoped to `auth.uid() = user_id`
- No UPDATE policy needed (bookmarks have no mutable fields)
- Backfills `bookmark_live: true` into existing profiles' email_preferences JSONB
</task>

<task id="2" title="Create bookmark Server Action">
Create `src/app/actions/bookmarks.js`:

```javascript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleBookmark(questionId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }
  if (!questionId) return { error: 'Missing question ID.' }

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('question_id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('question_id', questionId)

    if (error) return { error: 'Failed to remove bookmark.' }

    revalidatePath('/dashboard')
    revalidatePath('/questions/upcoming')
    return { success: true, bookmarked: false }
  } else {
    // Add bookmark
    const { error } = await supabase
      .from('bookmarks')
      .insert({ user_id: user.id, question_id: questionId })

    if (error) {
      if (error.message.includes('duplicate key')) {
        return { success: true, bookmarked: true }
      }
      return { error: 'Failed to save bookmark.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/questions/upcoming')
    return { success: true, bookmarked: true }
  }
}
```

Key details:
- Toggle pattern: check existence, then insert or delete
- Uses RLS (user can only manage their own bookmarks)
- Handles race condition: if duplicate key on insert, treat as already bookmarked
- Revalidates dashboard so saved section updates
</task>

<task id="3" title="Create BookmarkButton client component">
Create `src/components/BookmarkButton.jsx`:

```jsx
'use client'

import { useTransition, useOptimistic } from 'react'
import { toggleBookmark } from '@/app/actions/bookmarks'

export default function BookmarkButton({ questionId, isBookmarked, className = '' }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticBookmarked, setOptimisticBookmarked] = useOptimistic(isBookmarked)

  function handleClick() {
    startTransition(async () => {
      setOptimisticBookmarked(!optimisticBookmarked)
      await toggleBookmark(questionId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1 text-sm transition-colors ${
        optimisticBookmarked
          ? 'text-amber-600 hover:text-amber-700'
          : 'text-warm-400 hover:text-warm-600'
      } disabled:opacity-50 ${className}`}
      title={optimisticBookmarked ? 'Remove bookmark' : 'Save for later'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={optimisticBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
        />
      </svg>
      {optimisticBookmarked ? 'Saved' : 'Save'}
    </button>
  )
}
```

Key details:
- Uses `useOptimistic` for instant feedback (fill/unfill before server responds)
- `useTransition` keeps the button responsive during the async action
- Amber color when bookmarked (consistent with featured answer amber theme)
- SVG bookmark icon: outlined when not saved, filled when saved
- Compact: icon + "Save" / "Saved" text
</task>

<task id="4" title="Add BookmarkButton to upcoming and question pages">
**Update `src/app/questions/upcoming/page.jsx`:**

Add bookmark functionality. The page already has `user` from auth check. Need to:
1. Import `BookmarkButton`
2. Fetch user's bookmarks for the displayed questions
3. Add `BookmarkButton` to each question card

After the existing `user` auth check and question query, add a bookmark query:

```javascript
import BookmarkButton from '@/components/BookmarkButton'
```

After fetching `questions`, add:
```javascript
  // Fetch user's bookmarks for these questions
  const questionIds = (questions ?? []).map(q => q.id)
  const { data: bookmarks } = questionIds.length > 0
    ? await supabase
        .from('bookmarks')
        .select('question_id')
        .eq('user_id', user.id)
        .in('question_id', questionIds)
    : { data: [] }

  const bookmarkedIds = new Set((bookmarks ?? []).map(b => b.question_id))
```

In the question card JSX, add the BookmarkButton after the question body `<h2>`:
```jsx
<div className="flex items-center justify-between mt-3">
  <BookmarkButton
    questionId={q.id}
    isBookmarked={bookmarkedIds.has(q.id)}
  />
</div>
```

**Update `src/app/q/[slug]/page.jsx`:**

Add bookmark button next to the ShareButton in the question header section.

1. Import `BookmarkButton`
2. After the existing `user` auth check, fetch bookmark state:
```javascript
  let isBookmarked = false
  if (user) {
    const { data: bookmark } = await supabase
      .from('bookmarks')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_id', question.id)
      .maybeSingle()
    isBookmarked = !!bookmark
  }
```

3. Add BookmarkButton next to ShareButton (only when authenticated):
```jsx
{user && (
  <BookmarkButton
    questionId={question.id}
    isBookmarked={isBookmarked}
  />
)}
<ShareButton />
```

Place it in the existing `<div className="flex items-center gap-2 mb-2">` row alongside category and date.
</task>

<task id="5" title="Add Saved Questions section to dashboard">
Update `src/app/dashboard/page.jsx`:

1. Add these imports at the top of the file (Link is already imported):

```javascript
import BookmarkButton from '@/components/BookmarkButton'
import { format } from 'date-fns'
```

2. After existing queries, add bookmark query:

After the `todayQuestion` query, add:
```javascript
  // Fetch user's bookmarked questions
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('question_id, created_at, questions!inner(id, body, slug, category, publish_date, status)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const savedQuestions = (bookmarks ?? []).map(b => ({
    ...b.questions,
    bookmarkedAt: b.created_at,
  }))
```

3. Add "Saved Questions" section after the first-answer nudge and before the Notification Preferences section:

```jsx
{/* Saved Questions */}
{savedQuestions.length > 0 && (
  <section>
    <h2 className="text-lg font-semibold text-warm-800 mb-3">
      Saved Questions
    </h2>
    <div className="space-y-2">
      {savedQuestions.map((q) => {
        const isUpcoming = q.publish_date > todayStr
        return (
          <div
            key={q.id}
            className="flex items-center justify-between bg-white rounded-lg border border-warm-200 p-4"
          >
            <div className="min-w-0 flex-1 mr-3">
              <div className="flex items-center gap-2 mb-1">
                {q.category && (
                  <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                    {q.category}
                  </span>
                )}
                <span className="text-xs text-warm-400">
                  {format(new Date(q.publish_date), 'MMM d')}
                </span>
                {isUpcoming && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                    Upcoming
                  </span>
                )}
              </div>
              <Link
                href={isUpcoming ? '/questions/upcoming' : `/q/${q.slug}`}
                className="text-sm font-medium text-warm-900 hover:underline"
              >
                {q.body}
              </Link>
            </div>
            <BookmarkButton
              questionId={q.id}
              isBookmarked={true}
              className="flex-shrink-0"
            />
          </div>
        )
      })}
    </div>
  </section>
)}
```

</task>

<task id="6" title="Add bookmark-goes-live email to daily cron">
Update `src/app/api/cron/daily-emails/route.js`:

1. After the Daily Question Email section and before the Budget Reset Email section, add:

```javascript
    // === Bookmark Goes Live Email ===
    if (todayQuestion) {
      // Find users who bookmarked today's question
      const { data: bookmarkUsers } = await admin
        .from('bookmarks')
        .select('user_id')
        .eq('question_id', todayQuestion.id)

      if (bookmarkUsers && bookmarkUsers.length > 0) {
        const questionUrl = `${siteUrl}/q/${todayQuestion.slug}`

        for (const bookmark of bookmarkUsers) {
          const profile = profiles.find(p => p.id === bookmark.user_id)
          if (!profile) continue
          if (!profile.email_preferences?.bookmark_live) continue
          const email = emailMap[profile.id]
          if (!email) continue

          const content = `
            <h2 style="font-size:18px;color:#1c1917;margin:0 0 8px;">A question you saved is live!</h2>
            <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
              ${escapeHtml(profile.display_name || 'there')}, a question you bookmarked is now open for answers.
            </p>
            <div style="background-color:#faf9f7;border-radius:6px;padding:16px;margin:0 0 8px;">
              ${todayQuestion.category ? `<p style="font-size:11px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">${escapeHtml(todayQuestion.category)}</p>` : ''}
              <p style="font-size:17px;color:#1c1917;font-weight:600;margin:0;">
                ${escapeHtml(todayQuestion.body)}
              </p>
            </div>
            <p style="font-size:13px;color:#a8a29e;margin:0 0 20px;">
              ${format(today, 'EEEE, MMMM d, yyyy')}
            </p>
            <div style="text-align:center;">
              <a href="${questionUrl}" style="display:inline-block;padding:10px 24px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
                Answer now
              </a>
            </div>
          `

          const unsubscribeUrl = getUnsubscribeUrl(profile.unsubscribe_token, 'bookmark_live')
          const { error } = await sendEmail({
            to: email,
            subject: `Your saved question is live: ${todayQuestion.body.slice(0, 50)}${todayQuestion.body.length > 50 ? '...' : ''}`,
            html: emailLayout(content, unsubscribeUrl),
          })

          if (error) { results.errors++ } else { results.bookmark_live = (results.bookmark_live || 0) + 1 }
        }
      }
    }
```

2. Update the `results` initialization to include `bookmark_live`:
```javascript
const results = { daily: 0, budget_reset: 0, weekly_recap: 0, bookmark_live: 0, errors: 0 }
```

3. Update `src/components/EmailPreferencesForm.jsx` — add the bookmark_live toggle to the EMAIL_TYPES array:
```javascript
{ key: 'bookmark_live', label: 'Bookmark alerts', description: 'When a question you saved goes live and is ready to answer' },
```

4. Update `src/app/actions/profile.js` — add `bookmark_live` to the preferences object in `updateEmailPreferences`:
```javascript
const preferences = {
  daily_question: formData.get('daily_question') === 'on',
  weekly_recap: formData.get('weekly_recap') === 'on',
  budget_reset: formData.get('budget_reset') === 'on',
  featured_answer: formData.get('featured_answer') === 'on',
  bookmark_live: formData.get('bookmark_live') === 'on',
}
```
</task>

## Verification

- [ ] Migration creates `bookmarks` table with composite PK and RLS policies
- [ ] Migration adds `bookmark_live` to email_preferences default and backfills existing profiles
- [ ] `toggleBookmark` Server Action creates and removes bookmarks correctly
- [ ] BookmarkButton shows filled icon when bookmarked, outline when not
- [ ] Bookmark button appears on upcoming questions page (auth'd only)
- [ ] Bookmark button appears on question detail page (auth'd only)
- [ ] Dashboard shows "Saved Questions" section with bookmarked questions
- [ ] Saved questions link to the correct page (upcoming vs published)
- [ ] "Upcoming" badge appears on bookmarked questions not yet published
- [ ] Daily cron sends bookmark-goes-live email when bookmarked question publishes
- [ ] Bookmark email respects `bookmark_live` preference
- [ ] Bookmark email has unsubscribe link
- [ ] EmailPreferencesForm includes bookmark_live toggle
- [ ] updateEmailPreferences action includes bookmark_live field
- [ ] `npm run build` succeeds
