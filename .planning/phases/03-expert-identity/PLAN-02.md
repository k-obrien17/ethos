---
phase: 3
plan: "02"
title: "Public profile page, browse-by-person feed, expert linking"
wave: 1
depends_on: []
requirements: ["PROF-03", "PROF-04", "PROF-05", "FEED-02"]
files_modified:
  - "src/app/expert/[handle]/page.jsx"
  - "src/components/AnswerCard.jsx"
  - "src/components/HeaderAuth.jsx"
  - "src/app/q/[slug]/page.jsx"
  - "src/app/page.jsx"
  - "src/app/answers/[id]/page.jsx"
autonomous: true
estimated_tasks: 5
---

# Plan 02: Public profile page, browse-by-person feed, expert linking

## Objective

Build the public expert profile page at `/expert/[handle]` showing the expert's info, monthly selectivity stats, and full answer archive (browse-by-person feed). Make expert names clickable throughout the app by wrapping them in links to the profile page. Add a dashboard link in the header for authenticated users. All new pages are Server Components for SEO.

## must_haves

- Public profile page at `/expert/[handle]` shows expert info, bio, avatar, and linkedin_url (PROF-03, PROF-05)
- Profile page shows monthly answer count and selectivity ratio: "Answered X of Y questions this month" (PROF-04)
- Profile page shows expert's full answer archive with question context (FEED-02)
- Profile URL is shareable and works for unauthenticated visitors (PROF-05)
- Expert name/avatar on AnswerCard links to `/expert/[handle]` throughout the app
- Authenticated users see a "Dashboard" link in the header
- `generateMetadata` provides SEO-friendly title/description for profile pages

## Tasks

<task id="1" title="Create public profile page at /expert/[handle]">
Create `src/app/expert/[handle]/page.jsx` — the public expert profile page.

This page fetches:
1. Profile by handle
2. All answers by this expert, joined with question data
3. Monthly stats: answer count this month + total published questions this month

```jsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export const revalidate = 300  // 5 minutes

export async function generateMetadata({ params }) {
  const { handle } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, headline, bio')
    .eq('handle', handle)
    .single()

  if (!profile) return { title: 'Expert not found' }

  return {
    title: `${profile.display_name} — Ethos`,
    description: profile.headline || profile.bio?.slice(0, 150) || `${profile.display_name} on Ethos`,
  }
}

export default async function ExpertProfilePage({ params }) {
  const { handle } = await params
  const supabase = await createClient()
  const now = new Date()

  // Fetch profile by handle
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', handle)
    .single()

  if (!profile) notFound()

  // Fetch all answers with question context
  const { data: answers } = await supabase
    .from('answers')
    .select(`
      *,
      questions!inner (
        id, body, slug, category, publish_date
      )
    `)
    .eq('expert_id', profile.id)
    .order('created_at', { ascending: false })

  const allAnswers = answers ?? []

  // Monthly stats
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStr = now.toISOString().slice(0, 10)
  const monthlyAnswerCount = allAnswers.filter(a => a.created_at >= startOfMonth).length

  const { count: totalQuestionsThisMonth } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .lte('publish_date', todayStr)
    .gte('publish_date', startOfMonth.slice(0, 10))
    .in('status', ['scheduled', 'published'])

  // ... render profile header, stats, answer list
}
```

**Profile header section:**
- Avatar (or initial fallback)
- Display name
- Headline (if set)
- Organization (if set)
- Bio (if set)
- LinkedIn link (if set, opens in new tab)

**Stats section:**
- "Answered X of Y questions this month" (selectivity ratio)
- "Z total answers" (all-time count)
- Answer limit: "X/month budget"

**Answer archive section:**
- Each answer shows: question body (linked to `/q/[slug]`), category badge, date, answer body (Markdown), word count
- Use a compact layout that emphasizes the question context since the expert info is already shown at the top
- Ordered newest first

SEO: `generateMetadata` uses display_name, headline, and bio for title/description.
</task>

<task id="2" title="Add expert profile links to AnswerCard" depends_on="1">
Update `src/components/AnswerCard.jsx` to wrap the expert's display name and avatar in a `<Link>` to `/expert/[handle]`.

**Current:** Expert name is plain text `<p className="font-medium text-warm-900">{expert.display_name}</p>`

**New:** Wrap in `<Link href={`/expert/${expert.handle}`}>`. Both the avatar and name should be clickable.

```jsx
import Link from 'next/link'

// Inside the expert info section:
<Link href={`/expert/${expert.handle}`} className="flex items-center gap-3">
  {/* avatar */}
  <div>
    <p className="font-medium text-warm-900 hover:underline">
      {expert.display_name}
    </p>
    <p className="text-xs text-warm-500">
      {expert.display_name} chose to answer
      {monthlyUsage != null && expert.answer_limit != null && (
        <> · {monthlyUsage} of {expert.answer_limit} this month</>
      )}
    </p>
  </div>
</Link>
```

Note: The `expert.handle` field is already included in the Supabase select queries on `/q/[slug]` and `/answers/[id]`. Verify it's also included on the homepage query. If the homepage query doesn't select `handle` from profiles, add it.
</task>

<task id="3" title="Update homepage answer query to include handle">
Check `src/app/page.jsx` — the homepage fetches answers with profiles:

```javascript
.select(`
  *,
  profiles!inner (
    display_name,
    handle,
    avatar_url,
    answer_limit
  )
`)
```

Verify `handle` is already in the select. If not, add it. This is needed for the AnswerCard expert link (Task 2).

Also check the `/q/[slug]` page and `/answers/[id]` page queries — ensure `handle` is selected from profiles in all places where AnswerCard is rendered.
</task>

<task id="4" title="Add dashboard link to HeaderAuth" depends_on="1">
Update `src/components/HeaderAuth.jsx` to show a "Dashboard" link for authenticated users, alongside the budget indicator and sign out button.

```jsx
// In the authenticated section:
<div className="flex items-center gap-3">
  {budgetData && (
    <BudgetIndicator used={budgetData.used} limit={budgetData.limit} />
  )}
  <Link
    href="/dashboard"
    className="text-sm text-warm-600 hover:text-warm-900"
  >
    Dashboard
  </Link>
  <button
    onClick={handleSignOut}
    className="text-sm text-warm-500 hover:text-warm-700"
  >
    Sign out
  </button>
</div>
```

This gives authenticated users a way to navigate to their dashboard from any page.
</task>

<task id="5" title="Verify build and route structure" depends_on="2,3,4">
Run `npm run build` to verify:
1. `/expert/[handle]` route is recognized
2. All existing routes still build correctly
3. No import errors from the AnswerCard changes
4. `generateMetadata` on the profile page compiles correctly

Expected build output should show:
```
ƒ /expert/[handle]
```
as a dynamic route.
</task>

## Verification

- [ ] `/expert/[handle]` renders for existing profiles with display name, avatar, and bio
- [ ] `/expert/[handle]` returns 404 for non-existent handles
- [ ] Profile page shows monthly selectivity stats: "Answered X of Y questions this month" (PROF-04)
- [ ] Profile page shows full answer archive with question context (FEED-02)
- [ ] Profile URL is shareable — works for unauthenticated visitors (PROF-05)
- [ ] `generateMetadata` provides SEO-friendly title/description
- [ ] Expert names on AnswerCards link to `/expert/[handle]` on homepage, question page, and answer page
- [ ] Authenticated users see "Dashboard" link in header
- [ ] `npm run build` succeeds with all routes
