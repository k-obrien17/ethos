---
phase: 4
plan: "04"
title: "Answer moderation UI — admin answers page with hide/unhide"
wave: 2
depends_on: ["01"]
requirements: ["ADMN-05"]
files_modified:
  - "src/app/actions/answers.js"
  - "src/components/admin/ToggleHideButton.jsx"
  - "src/app/admin/answers/page.jsx"
autonomous: true
estimated_tasks: 3
---

# Plan 04: Answer moderation UI

## Objective

Build the admin answer moderation interface where admins can browse all answers (including hidden ones) and hide/unhide them. This depends on Plan 01 (hidden_at and hidden_by columns exist, admin UPDATE policy on answers). Covers ADMN-05 (admin can hide/flag published answers).

## must_haves

- Admin answers page lists all answers with expert name and question context (ADMN-05)
- Admin can hide a published answer (sets hidden_at and hidden_by) (ADMN-05)
- Admin can unhide a previously hidden answer (clears hidden_at and hidden_by) (ADMN-05)
- Hidden answers are visually distinguished in the admin list
- Hidden answers are NOT visible to public users (enforced by RLS from Plan 01)

## Tasks

<task id="1" title="Add toggleAnswerVisibility Server Action">
Add a `toggleAnswerVisibility` function to `src/app/actions/answers.js`:

```javascript
export async function toggleAnswerVisibility(answerId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  // Get current state
  const { data: answer } = await supabase
    .from('answers')
    .select('hidden_at, question_id, questions(slug)')
    .eq('id', answerId)
    .single()

  if (!answer) return { error: 'Answer not found.' }

  const isHidden = !!answer.hidden_at

  const { error } = await supabase
    .from('answers')
    .update({
      hidden_at: isHidden ? null : new Date().toISOString(),
      hidden_by: isHidden ? null : user.id,
    })
    .eq('id', answerId)

  if (error) return { error: 'Failed to update answer visibility.' }

  revalidatePath('/admin/answers')
  revalidatePath(`/answers/${answerId}`)
  if (answer.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }
  revalidatePath('/')

  return { success: true, hidden: !isHidden }
}
```

Key details:
- Toggles: if currently hidden → unhide, if visible → hide
- Sets hidden_by to the admin who performed the action
- Clears both hidden_at and hidden_by on unhide
- Revalidates all pages that might show this answer
</task>

<task id="2" title="Create ToggleHideButton component">
Create `src/components/admin/ToggleHideButton.jsx` — a Client Component button for hiding/unhiding answers.

```jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAnswerVisibility } from '@/app/actions/answers'

export default function ToggleHideButton({ answerId, isHidden }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleToggle() {
    setPending(true)
    const result = await toggleAnswerVisibility(answerId)
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
        isHidden
          ? 'bg-green-50 text-green-700 hover:bg-green-100'
          : 'bg-red-50 text-red-700 hover:bg-red-100'
      } disabled:opacity-50`}
    >
      {pending ? '...' : isHidden ? 'Unhide' : 'Hide'}
    </button>
  )
}
```

Visual distinction: Hide button (red-tinted), Unhide button (green-tinted).
</task>

<task id="3" title="Create admin answers page">
Create `src/app/admin/answers/page.jsx` — Server Component listing all answers for moderation.

```jsx
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import ToggleHideButton from '@/components/admin/ToggleHideButton'

export const metadata = { title: 'Answer Moderation — Admin — Ethos' }

export default async function AdminAnswersPage() {
  const supabase = await createClient()

  const { data: answers } = await supabase
    .from('answers')
    .select(`
      id, body, word_count, created_at, hidden_at, hidden_by,
      profiles!expert_id (display_name, handle),
      questions!question_id (body, slug, publish_date)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-warm-900">Answer Moderation</h1>

      {(answers ?? []).map((answer) => (
        <article
          key={answer.id}
          className={`p-4 rounded-lg border ${
            answer.hidden_at
              ? 'border-red-200 bg-red-50/50'
              : 'border-warm-200 bg-white'
          }`}
        >
          {/* Expert name + question context */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium text-warm-900">
                {answer.profiles?.display_name}
              </span>
              <span className="text-warm-400 text-sm ml-2">
                @{answer.profiles?.handle}
              </span>
            </div>
            <ToggleHideButton
              answerId={answer.id}
              isHidden={!!answer.hidden_at}
            />
          </div>

          {/* Question context */}
          <p className="text-sm text-warm-500 mb-2">
            Q: {answer.questions?.body?.slice(0, 100)}
          </p>

          {/* Answer preview */}
          <p className="text-warm-700 text-sm line-clamp-3">
            {answer.body?.slice(0, 300)}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs text-warm-400">
            <span>{answer.word_count} words</span>
            <span>{format(new Date(answer.created_at), 'MMM d, yyyy')}</span>
            {answer.hidden_at && (
              <span className="text-red-500 font-medium">
                Hidden {format(new Date(answer.hidden_at), 'MMM d')}
              </span>
            )}
          </div>
        </article>
      ))}

      {(!answers || answers.length === 0) && (
        <p className="text-warm-500 text-sm text-center py-8">
          No answers yet.
        </p>
      )}
    </div>
  )
}
```

Key features:
- Admin sees ALL answers including hidden (admin RLS read policy from Plan 01)
- Hidden answers have red-tinted border/background and "Hidden [date]" label
- Each answer shows: expert name/handle, question preview, answer preview (truncated), word count, date
- Toggle button per answer for hide/unhide
- Ordered by most recent first
</task>

## Verification

- [ ] Admin answers page lists all answers including hidden ones (ADMN-05)
- [ ] Admin can hide a visible answer (ADMN-05)
- [ ] Admin can unhide a hidden answer (ADMN-05)
- [ ] Hidden answers show visual distinction (red border/background, "Hidden" label)
- [ ] Hidden answers are NOT visible on public pages (RLS enforcement from Plan 01)
- [ ] `hidden_by` tracks which admin performed the moderation action
- [ ] Hiding/unhiding an answer revalidates affected public pages
- [ ] `npm run build` succeeds
