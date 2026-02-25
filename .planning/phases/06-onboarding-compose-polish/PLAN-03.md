---
phase: 6
plan: "03"
title: "15-minute answer edit window"
wave: 2
depends_on: ["01", "02"]
requirements: ["ONBR-04", "ONBR-05"]
files_modified:
  - "src/app/actions/answers.js"
  - "src/components/EditableAnswerCard.jsx"
  - "src/app/q/[slug]/page.jsx"
  - "src/app/answers/[id]/page.jsx"
autonomous: true
estimated_tasks: 4
---

# Plan 03: 15-minute answer edit window

## Objective

Allow experts to edit their answer body within 15 minutes of submission. After 15 minutes, the answer becomes permanent. Server-enforced time check ensures the window cannot be bypassed. Uses the Markdown preview pattern from Plan 02 in the edit form.

## must_haves

- Expert can edit their own answer body within 15 minutes of submission (ONBR-04)
- Edit button only appears on own answers within the 15-minute window (ONBR-04)
- Edit mode shows textarea with current body (with Markdown preview toggle) (ONBR-04)
- Server Action rejects edits after 15 minutes with clear error message (ONBR-05)
- Server Action validates: auth, ownership, time window, body length (ONBR-05)
- word_count is recalculated on edit (ONBR-05)
- Revalidation of affected pages after edit (ONBR-05)
- No schema changes needed — existing RLS allows expert UPDATE on own visible answers
- If an answer is hidden by admin during the edit window, the SELECT returns null ("Answer not found") — this is correct and safe (RLS `hidden_at IS NULL` filter applies to both SELECT and UPDATE)

## Tasks

<task id="1" title="Add editAnswer Server Action">
Add `editAnswer` function to `src/app/actions/answers.js`:

```javascript
export async function editAnswer(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const answerId = formData.get('answerId')
  const body = formData.get('body')?.trim()

  if (!answerId) return { error: 'Missing answer ID.' }
  if (!body || body.length < 10) return { error: 'Answer must be at least 10 characters.' }
  if (body.length > 10000) return { error: 'Answer must be under 10,000 characters.' }

  // Fetch the answer to verify ownership and time window
  const { data: answer } = await supabase
    .from('answers')
    .select('expert_id, created_at, question_id, questions!inner(slug)')
    .eq('id', answerId)
    .single()

  if (!answer) return { error: 'Answer not found.' }
  if (answer.expert_id !== user.id) return { error: 'You can only edit your own answers.' }

  // Enforce 15-minute edit window
  const createdAt = new Date(answer.created_at)
  const now = new Date()
  const diffMinutes = (now - createdAt) / (1000 * 60)

  if (diffMinutes > 15) {
    return { error: 'Edit window has closed. Answers can only be edited within 15 minutes of submission.' }
  }

  // Recalculate word count
  const wordCount = body.split(/\s+/).filter(Boolean).length

  // Update the answer
  const { error } = await supabase
    .from('answers')
    .update({ body, word_count: wordCount, updated_at: new Date().toISOString() })
    .eq('id', answerId)

  if (error) return { error: 'Failed to update answer. Please try again.' }

  // Revalidate affected pages
  revalidatePath(`/answers/${answerId}`)
  if (answer.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }
  revalidatePath('/')

  return { success: true }
}
```

Key details:
- Ownership check: `answer.expert_id !== user.id`
- Time check: `(now - created_at) > 15 minutes`
- word_count recalculated server-side
- RLS already allows expert UPDATE on own visible answers (00005 migration)
- updated_at is set explicitly (the trigger auto-updates it too, but explicit is clearer)
</task>

<task id="2" title="Add edit mode to AnswerCard">
Update `src/components/AnswerCard.jsx` to support inline editing.

New props: `currentUserId` (string, optional) — passed from parent Server Components.

The component needs to become a Client Component to handle edit state, OR we create a wrapper. Since AnswerCard already imports ReactMarkdown (fine as Server Component with RSC-compatible react-markdown), the simplest approach is to create a new `EditableAnswerCard` Client Component wrapper.

**Create `src/components/EditableAnswerCard.jsx`:**

```jsx
'use client'

import { useState, useActionState } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { editAnswer } from '@/app/actions/answers'

const MARKDOWN_STYLES = "text-warm-800 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:text-warm-700 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mb-1"

export default function EditableAnswerCard({ answer, expert, monthlyUsage, currentUserId }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(answer.body)
  const [showPreview, setShowPreview] = useState(false)
  const [state, formAction, pending] = useActionState(editAnswer, null)

  // Calculate if within edit window
  const isOwner = currentUserId === expert.id
  const createdAt = new Date(answer.created_at)
  const minutesAgo = (Date.now() - createdAt.getTime()) / (1000 * 60)
  const canEdit = isOwner && minutesAgo <= 15
  const minutesRemaining = Math.max(0, Math.ceil(15 - minutesAgo))

  // Handle successful edit
  if (state?.success && editing) {
    setEditing(false)
  }

  if (editing) {
    return (
      <article className="p-6 bg-white rounded-lg border border-warm-200">
        {/* Expert info (same as AnswerCard) */}
        <Link href={`/expert/${expert.handle}`} className="flex items-center gap-3 mb-4 group">
          {/* ... avatar + name (same as AnswerCard) */}
        </Link>

        {/* Edit form */}
        <form action={formAction}>
          <input type="hidden" name="answerId" value={answer.id} />

          {/* Write/Preview tabs (same pattern as AnswerForm Plan 02) */}
          <div className="border border-warm-200 rounded-lg overflow-hidden">
            <div className="flex border-b border-warm-200 bg-warm-50">
              <button type="button" onClick={() => setShowPreview(false)}
                className={`px-4 py-2 text-sm font-medium ${!showPreview ? 'text-warm-900 bg-white border-b-2 border-warm-800' : 'text-warm-500 hover:text-warm-700'}`}>
                Write
              </button>
              <button type="button" onClick={() => setShowPreview(true)}
                className={`px-4 py-2 text-sm font-medium ${showPreview ? 'text-warm-900 bg-white border-b-2 border-warm-800' : 'text-warm-500 hover:text-warm-700'}`}>
                Preview
              </button>
            </div>

            <textarea
              name="body"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
              minLength={10}
              className={showPreview ? 'sr-only' : 'w-full px-3 py-2 text-warm-900 focus:outline-none resize-y border-0'}
              tabIndex={showPreview ? -1 : undefined}
            />
            {showPreview && (
              <div className="min-h-[156px] px-3 py-2">
                {content ? (
                  <div className={MARKDOWN_STYLES}>
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-warm-400 text-sm py-2">Nothing to preview yet.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-warm-400">
              {minutesRemaining} min remaining to edit
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setEditing(false); setContent(answer.body) }}
                disabled={pending}
                className="px-3 py-1.5 text-sm text-warm-600 hover:text-warm-800">
                Cancel
              </button>
              <button type="submit" disabled={pending || content.trim().length < 10}
                className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors">
                {pending ? 'Saving...' : 'Save Edit'}
              </button>
            </div>
          </div>

          {state?.error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{state.error}</p>
          )}
        </form>
      </article>
    )
  }

  // Non-editing mode — same as AnswerCard but with edit button
  return (
    <article id={`answer-${answer.id}`} className="p-6 bg-white rounded-lg border border-warm-200">
      <Link href={`/expert/${expert.handle}`} className="flex items-center gap-3 mb-4 group">
        {expert.avatar_url ? (
          <img src={expert.avatar_url} alt={expert.display_name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-warm-200 flex items-center justify-center text-warm-600 font-medium text-sm">
            {expert.display_name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium text-warm-900 group-hover:underline">{expert.display_name}</p>
          <p className="text-xs text-warm-500">
            {expert.display_name} chose to answer
            {monthlyUsage != null && expert.answer_limit != null && (
              <> · {monthlyUsage} of {expert.answer_limit} this month</>
            )}
          </p>
        </div>
      </Link>

      <div className={MARKDOWN_STYLES}>
        <ReactMarkdown>{answer.body}</ReactMarkdown>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-warm-100 text-xs text-warm-400">
        <span>{answer.word_count} words</span>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button onClick={() => setEditing(true)} className="text-warm-500 hover:text-warm-700 font-medium">
              Edit ({minutesRemaining}m left)
            </button>
          )}
          <Link href={`/answers/${answer.id}`} className="hover:text-warm-600">Link</Link>
        </div>
      </div>
    </article>
  )
}
```

**Keep the existing `AnswerCard.jsx` unchanged** — it remains a simple Server Component for use where edit functionality isn't needed (e.g., expert profile page archive). Use `EditableAnswerCard` on pages where the current user might be viewing their own recent answer.
</task>

<task id="3" title="Use EditableAnswerCard on question page">
Update `src/app/q/[slug]/page.jsx`:

Import `EditableAnswerCard` and use it instead of `AnswerCard` in the answers list. Pass the current user's ID so the component can determine if the answer is editable.

```jsx
import EditableAnswerCard from '@/components/EditableAnswerCard'

// In the answers rendering section:
{answers.map((answer) => (
  <EditableAnswerCard
    key={answer.id}
    answer={answer}
    expert={answer.profiles}
    monthlyUsage={monthlyUsageMap[answer.profiles.id] ?? null}
    currentUserId={user?.id}
  />
))}
```

The `user` variable is already fetched on this page (line 97). Just pass `user?.id` to each card.

Note: For the homepage, keep using `AnswerCard` (not editable) — editing from the homepage isn't expected UX. Editing happens on the question detail page where the user is most engaged.
</task>

<task id="4" title="Use EditableAnswerCard on answer detail page">
Update `src/app/answers/[id]/page.jsx`:

Import `EditableAnswerCard` and use it instead of `AnswerCard`. Fetch the current user to pass their ID.

```jsx
import EditableAnswerCard from '@/components/EditableAnswerCard'

// Add auth check:
const { data: { user } } = await supabase.auth.getUser()

// Replace AnswerCard usage:
<EditableAnswerCard
  answer={answer}
  expert={answer.profiles}
  monthlyUsage={null}
  currentUserId={user?.id}
/>
```
</task>

## Verification

- [ ] "Edit" button appears on own answers within 15 minutes of submission
- [ ] "Edit" button shows remaining minutes (e.g., "Edit (12m left)")
- [ ] "Edit" button does NOT appear on other users' answers
- [ ] "Edit" button does NOT appear after 15 minutes
- [ ] Clicking Edit opens inline edit form with current body text
- [ ] Edit form has Write/Preview tabs (Markdown preview)
- [ ] Cancel button restores original text and exits edit mode
- [ ] Save Edit updates the answer body and word count
- [ ] Server rejects edits after 15 minutes with clear error message
- [ ] Server rejects edits on other users' answers
- [ ] Edited answer appears correctly on question page and answer detail page
- [ ] Edit works from /q/[slug] page
- [ ] Edit works from /answers/[id] page
- [ ] Homepage continues to use non-editable AnswerCard
- [ ] `npm run build` succeeds
