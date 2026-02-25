---
phase: 4
plan: "03"
title: "Queue dashboard + scheduling — admin overview and reorder"
wave: 2
depends_on: ["02"]
requirements: ["ADMN-02", "ADMN-06"]
files_modified:
  - "src/app/admin/page.jsx"
  - "src/app/actions/questions.js"
  - "src/components/admin/RescheduleForm.jsx"
autonomous: true
estimated_tasks: 3
---

# Plan 03: Queue dashboard + scheduling

## Objective

Build the admin dashboard (landing page at `/admin`) with queue overview, depth indicator, gap detection, and the ability to reschedule questions by changing their publish dates. This depends on Plan 02 (question CRUD exists). Covers ADMN-02 (reorder queue) and ADMN-06 (queue dashboard with depth).

## must_haves

- Admin dashboard shows upcoming question queue ordered by publish_date (ADMN-06)
- Queue depth indicator: "X questions scheduled, covering through [date]" (ADMN-06)
- Gap detection: highlight missing dates in the upcoming schedule (ADMN-06)
- Admin can reschedule a question by changing its publish_date (ADMN-02)
- Dashboard shows summary stats: total questions, drafts count, published count
- Draft questions (no publish_date) shown separately for scheduling

## Tasks

<task id="1" title="Add rescheduleQuestion Server Action">
Add a `rescheduleQuestion` function to `src/app/actions/questions.js`:

```javascript
export async function rescheduleQuestion(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const questionId = formData.get('question_id')
  const publishDate = formData.get('publish_date')

  if (!questionId) return { error: 'Question ID required.' }
  if (!publishDate) return { error: 'Publish date required.' }

  const { error } = await supabase
    .from('questions')
    .update({
      publish_date: publishDate,
      status: 'scheduled',
    })
    .eq('id', questionId)

  if (error) return { error: 'Failed to reschedule question.' }

  revalidatePath('/admin')
  revalidatePath('/admin/questions')
  revalidatePath('/questions')
  revalidatePath('/')

  return { success: true }
}
```

Key details:
- Sets status to 'scheduled' when assigning a publish_date (auto-transition from draft)
- Admin role verified server-side
- Revalidates admin and public pages
</task>

<task id="2" title="Create RescheduleForm component">
Create `src/components/admin/RescheduleForm.jsx` — inline date picker for rescheduling from the dashboard.

```jsx
'use client'

import { useActionState } from 'react'
import { rescheduleQuestion } from '@/app/actions/questions'

export default function RescheduleForm({ questionId, currentDate }) {
  const [state, formAction, pending] = useActionState(rescheduleQuestion, null)

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="question_id" value={questionId} />
      <input
        type="date"
        name="publish_date"
        defaultValue={currentDate ?? ''}
        required
        className="text-xs px-2 py-1 border border-warm-200 rounded ..."
      />
      <button type="submit" disabled={pending} className="text-xs ...">
        {pending ? '...' : 'Set'}
      </button>
      {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  )
}
```

Compact inline form that sits next to each question in the queue view.
</task>

<task id="3" title="Rewrite admin dashboard page with queue overview">
Rewrite `src/app/admin/page.jsx` with:

```jsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, addDays, differenceInDays } from 'date-fns'
import RescheduleForm from '@/components/admin/RescheduleForm'

export const metadata = { title: 'Admin Dashboard — Ethos' }

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const todayStr = new Date().toISOString().slice(0, 10)

  // Fetch all questions for stats
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, body, slug, category, publish_date, status')
    .order('publish_date', { ascending: true })

  const questions = allQuestions ?? []
  const drafts = questions.filter(q => q.status === 'draft' || !q.publish_date)
  const upcoming = questions.filter(q =>
    q.publish_date && q.publish_date >= todayStr && q.status === 'scheduled'
  )
  const published = questions.filter(q =>
    q.status === 'published' || (q.publish_date && q.publish_date < todayStr)
  )

  // Queue depth: how many days of scheduled questions from today
  const lastScheduledDate = upcoming.length > 0
    ? upcoming[upcoming.length - 1].publish_date
    : null
  const queueDepthDays = lastScheduledDate
    ? differenceInDays(new Date(lastScheduledDate), new Date(todayStr))
    : 0

  // Gap detection: find missing dates in the upcoming range
  const scheduledDates = new Set(upcoming.map(q => q.publish_date))
  const gaps = []
  if (lastScheduledDate) {
    let d = new Date(todayStr)
    const end = new Date(lastScheduledDate)
    while (d <= end) {
      const ds = d.toISOString().slice(0, 10)
      if (!scheduledDates.has(ds)) gaps.push(ds)
      d = addDays(d, 1)
    }
  }

  return (
    <div className="space-y-8">
      <h1>Admin Dashboard</h1>

      {/* Summary stats */}
      <section className="grid grid-cols-4 gap-4">
        {/* Total | Drafts | Scheduled | Published */}
      </section>

      {/* Queue depth + gaps */}
      <section>
        <p>Queue depth: {queueDepthDays} days ({upcoming.length} questions)</p>
        {gaps.length > 0 && (
          <p className="text-amber-600">
            ⚠ {gaps.length} gap{gaps.length !== 1 ? 's' : ''} in schedule
          </p>
        )}
      </section>

      {/* Upcoming queue — editable dates */}
      <section>
        <h2>Upcoming Queue</h2>
        {upcoming.map(q => (
          <div key={q.id}>
            <span>{q.body.slice(0, 80)}</span>
            <RescheduleForm questionId={q.id} currentDate={q.publish_date} />
            <Link href={`/admin/questions/${q.id}/edit`}>Edit</Link>
          </div>
        ))}
      </section>

      {/* Drafts needing dates */}
      {drafts.length > 0 && (
        <section>
          <h2>Unscheduled Drafts ({drafts.length})</h2>
          {drafts.map(q => (
            <div key={q.id}>
              <span>{q.body.slice(0, 80)}</span>
              <RescheduleForm questionId={q.id} />
              <Link href={`/admin/questions/${q.id}/edit`}>Edit</Link>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
```

Key features:
- Summary stat cards (total, drafts, scheduled, published)
- Queue depth: days of content remaining, number of scheduled questions
- Gap detection: finds dates between today and last scheduled date with no question
- Upcoming queue: each question shows body preview, current date, inline reschedule form, edit link
- Unscheduled drafts: questions that need dates assigned, with inline schedule form
</task>

## Verification

- [ ] Admin dashboard shows total/draft/scheduled/published question counts (ADMN-06)
- [ ] Queue depth indicator shows days of scheduled content remaining (ADMN-06)
- [ ] Gaps in schedule are detected and highlighted (ADMN-06)
- [ ] Admin can reschedule a question by changing its publish_date (ADMN-02)
- [ ] Rescheduling a draft auto-sets status to 'scheduled' (ADMN-02)
- [ ] Unscheduled drafts are listed separately with scheduling controls
- [ ] Upcoming queue is ordered by publish_date ascending
- [ ] `npm run build` succeeds
