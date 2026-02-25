---
phase: 7
plan: "02"
title: "Featured answers with admin toggle"
wave: 1
depends_on: []
requirements: ["FEAT-01", "FEAT-02", "FEAT-03", "FEAT-04"]
files_modified:
  - "supabase/migrations/00008_featured_answers.sql"
  - "src/app/actions/answers.js"
  - "src/components/admin/ToggleFeatureButton.jsx"
  - "src/app/admin/answers/page.jsx"
  - "src/components/AnswerCard.jsx"
  - "src/components/EditableAnswerCard.jsx"
  - "src/app/q/[slug]/page.jsx"
  - "src/app/page.jsx"
  - "src/app/answers/[id]/page.jsx"
autonomous: true
estimated_tasks: 5
---

# Plan 02: Featured answers with admin toggle

## Objective

Let admins mark one answer per question as "featured" (editorial pick). Featured answers display with a visual badge in all feeds and sort first on question pages. Uses the same soft-column pattern as hidden_at/hidden_by from migration 00005.

## must_haves

- Admin can mark one answer per question as "featured" (FEAT-01)
- Featured answer displays with visual distinction (badge/highlight) in all feeds (FEAT-02)
- Featured answer appears first in the answer list on question pages (FEAT-03)
- Admin UI toggle for featuring/unfeaturing answers on admin answers page (FEAT-04)
- One featured answer per question enforced at DB level (UNIQUE partial index)
- No new RLS policies needed — existing admin update policy covers featured_at/featured_by

## Tasks

<task id="1" title="Migration: featured_at/featured_by columns + constraint">
Create `supabase/migrations/00008_featured_answers.sql`:

```sql
-- ============================================================
-- Featured answers: editorial pick infrastructure
-- ============================================================
-- Adds featured_at / featured_by columns so admins can mark
-- one answer per question as featured. UNIQUE partial index
-- enforces the one-per-question constraint at DB level.

-- Add featured columns (same pattern as hidden_at/hidden_by)
ALTER TABLE public.answers
  ADD COLUMN featured_at TIMESTAMPTZ,
  ADD COLUMN featured_by UUID REFERENCES public.profiles(id);

-- Enforce: at most one featured answer per question
CREATE UNIQUE INDEX idx_answers_featured_question
  ON public.answers (question_id)
  WHERE featured_at IS NOT NULL;

-- Index for efficient featured answer lookups
CREATE INDEX idx_answers_featured
  ON public.answers (featured_at)
  WHERE featured_at IS NOT NULL;
```

Key details:
- Same pattern as hidden_at/hidden_by (migration 00005)
- UNIQUE partial index prevents two featured answers for the same question — DB-enforced
- No new RLS needed: existing "Admins can update answers" policy (00005) allows admins to set featured_at/featured_by
- featured_at/featured_by are readable by public via existing "Visible answers are publicly readable" policy
</task>

<task id="2" title="Add toggleFeaturedAnswer Server Action">
Add `toggleFeaturedAnswer` function to `src/app/actions/answers.js`:

```javascript
export async function toggleFeaturedAnswer(answerId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  // Get current state + question context
  const { data: answer } = await supabase
    .from('answers')
    .select('featured_at, question_id, questions!inner(slug)')
    .eq('id', answerId)
    .single()

  if (!answer) return { error: 'Answer not found.' }

  const isFeatured = !!answer.featured_at

  if (isFeatured) {
    // Unfeature this answer
    const { error } = await supabase
      .from('answers')
      .update({ featured_at: null, featured_by: null })
      .eq('id', answerId)

    if (error) return { error: 'Failed to unfeature answer.' }
  } else {
    // Clear any existing featured answer for this question first
    const { error: clearError } = await supabase
      .from('answers')
      .update({ featured_at: null, featured_by: null })
      .eq('question_id', answer.question_id)
      .not('featured_at', 'is', null)

    if (clearError) return { error: 'Failed to clear existing featured answer.' }

    // Feature this answer
    const { error } = await supabase
      .from('answers')
      .update({
        featured_at: new Date().toISOString(),
        featured_by: user.id,
      })
      .eq('id', answerId)

    if (error) return { error: 'Failed to feature answer.' }
  }

  // Revalidate affected pages
  revalidatePath('/admin/answers')
  revalidatePath(`/answers/${answerId}`)
  if (answer.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }
  revalidatePath('/')

  return { success: true, featured: !isFeatured }
}
```

Key details:
- Mirrors `toggleAnswerVisibility` pattern exactly
- Admin check: profile.role !== 'admin' → reject
- Toggle: if already featured → clear; if not → clear existing featured for same question, then feature this one
- Clear-then-set avoids UNIQUE constraint violation
- Revalidates admin page, answer detail, question page, and homepage
</task>

<task id="3" title="Create ToggleFeatureButton admin component">
Create `src/components/admin/ToggleFeatureButton.jsx`:

```jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFeaturedAnswer } from '@/app/actions/answers'

export default function ToggleFeatureButton({ answerId, isFeatured }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleToggle() {
    setPending(true)
    const result = await toggleFeaturedAnswer(answerId)
    if (result?.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setPending(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`text-xs px-2 py-1 rounded ${
        isFeatured
          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
      } disabled:opacity-50`}
    >
      {pending ? '...' : isFeatured ? 'Unfeature' : 'Feature'}
    </button>
  )
}
```

Mirrors `ToggleHideButton` pattern exactly. Amber color for featured state (distinct from green/red of hide toggle).
</task>

<task id="4" title="Add ToggleFeatureButton to admin answers page">
Update `src/app/admin/answers/page.jsx`:

Import `ToggleFeatureButton` and add it to the admin answers page. Also select `featured_at` in the query and show featured state.

```jsx
import ToggleFeatureButton from '@/components/admin/ToggleFeatureButton'
```

Update the Supabase query to include `featured_at`:
```jsx
const { data: answers } = await supabase
  .from('answers')
  .select(`
    id, body, word_count, created_at, hidden_at, hidden_by, featured_at,
    profiles!expert_id (display_name, handle),
    questions!question_id (body, slug, publish_date)
  `)
  .order('created_at', { ascending: false })
```

In each answer article, add the ToggleFeatureButton next to ToggleHideButton:
```jsx
<div className="flex items-center gap-2">
  <ToggleFeatureButton
    answerId={answer.id}
    isFeatured={!!answer.featured_at}
  />
  <ToggleHideButton
    answerId={answer.id}
    isHidden={!!answer.hidden_at}
  />
</div>
```

Also add a featured indicator in the meta section:
```jsx
{answer.featured_at && (
  <span className="text-amber-600 font-medium">
    Featured
  </span>
)}
```
</task>

<task id="5" title="Featured badge on AnswerCard, EditableAnswerCard, and featured-first sorting">
**AnswerCard.jsx** — Add `featured` prop and badge:

Add prop: `featured` (boolean, optional, defaults to false).

After the expert info link, before the answer body, add:
```jsx
{featured && (
  <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-amber-700">
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 1l2.39 6.34H19l-5.3 3.85L15.3 18 10 13.82 4.7 18l1.61-6.81L1 7.34h6.61L10 1z" />
    </svg>
    Featured
  </div>
)}
```

**EditableAnswerCard.jsx** — Add `featured` prop and badge:

Same badge markup in both the editing and non-editing renders. Place after the expert link, before the answer body/form.

**q/[slug]/page.jsx** — Sort featured first and pass prop:

Update the answer query to sort featured answers first:
```jsx
const { data: answers } = await supabase
  .from('answers')
  .select(`
    *,
    profiles!inner (
      id,
      display_name,
      handle,
      avatar_url,
      answer_limit
    )
  `)
  .eq('question_id', question.id)
  .order('created_at', { ascending: false })
```

Since Supabase JS doesn't support `ORDER BY featured_at IS NULL`, sort in JavaScript after fetch:
```javascript
// Sort: featured first, then by created_at DESC
const sortedAnswers = (answers ?? []).sort((a, b) => {
  if (a.featured_at && !b.featured_at) return -1
  if (!a.featured_at && b.featured_at) return 1
  return new Date(b.created_at) - new Date(a.created_at)
})
```

Pass `featured` prop to EditableAnswerCard:
```jsx
{sortedAnswers.map((answer) => (
  <EditableAnswerCard
    key={answer.id}
    answer={answer}
    expert={answer.profiles}
    monthlyUsage={monthlyUsageMap[answer.profiles.id] ?? null}
    currentUserId={user?.id}
    featured={!!answer.featured_at}
  />
))}
```

**Homepage** — Pass `featured` prop to AnswerCard (badge shows, but no sort change):
```jsx
<AnswerCard
  key={answer.id}
  answer={answer}
  expert={answer.profiles}
  monthlyUsage={null}
  featured={!!answer.featured_at}
/>
```

Note: Homepage answer order stays `created_at DESC` per FEAT-03 scope ("question pages").

**answers/[id]/page.jsx** — Pass `featured` prop to EditableAnswerCard:

The page already selects `*` from answers (so `featured_at` is available). Update the EditableAnswerCard usage:
```jsx
<EditableAnswerCard
  answer={answer}
  expert={answer.profiles}
  monthlyUsage={null}
  currentUserId={user?.id}
  featured={!!answer.featured_at}
/>
```
</task>

## Verification

- [ ] Admin can feature an answer via toggle button on admin answers page
- [ ] Admin can unfeature a previously featured answer
- [ ] Featuring answer A auto-unfeatures any previously featured answer B on the same question
- [ ] Non-admin users cannot feature answers (Server Action rejects)
- [ ] Featured answer shows star badge on question page (`/q/[slug]`)
- [ ] Featured answer shows star badge on homepage
- [ ] Featured answer shows star badge on answer detail page (`/answers/[id]`)
- [ ] Featured answer appears first on question page (sorted before non-featured)
- [ ] Homepage order is unchanged (created_at DESC, badge still visible)
- [ ] Admin page shows "Featured" label and toggle for each answer
- [ ] Admin page shows both Feature and Hide buttons per answer
- [ ] `npm run build` succeeds
