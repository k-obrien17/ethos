---
phase: 2
plan: "03"
title: "Answer submission — form, three-layer budget enforcement, draft auto-save"
wave: 2
depends_on: ["01", "02"]
requirements: ["ANS-01", "ANS-02", "ANS-03", "ANS-04", "ANS-07"]
files_modified:
  - "src/app/actions/answers.js"
  - "src/components/AnswerForm.jsx"
  - "src/components/BudgetIndicator.jsx"
  - "src/components/Header.jsx"
  - "src/app/q/[slug]/page.jsx"
  - "src/app/layout.jsx"
autonomous: true
estimated_tasks: 7
---

# Plan 03: Answer submission — form, three-layer budget enforcement, draft auto-save

## Objective

Wire up the complete answer submission flow with three layers of budget enforcement: client-side UX (disable form when budget exhausted), Server Action validation (count check before database call), and database advisory lock function (absolute enforcement from Plan 01). Build the answer form as a Client Component with textarea, word count, and draft auto-save to localStorage. Add the budget indicator to the site header and the answer form. Integrate the answer form into the question detail page from Plan 02.

**Depends on:** Plan 01 (the `submit_answer()` database function) and Plan 02 (the question detail page and component structure).

## must_haves

- Authenticated expert can submit an answer to today's question (ANS-01)
- Budget enforced at Layer 1: AnswerForm disabled when remaining budget is 0 (client UX)
- Budget enforced at Layer 2: Server Action checks monthly count before calling database function
- Budget enforced at Layer 3: `submit_answer()` advisory lock function rejects over-limit inserts (ANS-02)
- Budget display: "X of Y remaining this month" visible in header and answer form (ANS-03)
- Draft auto-save: in-progress text persists in localStorage across page navigation and browser close (ANS-04)
- Draft cleared on successful submission
- Free tier: 3 answers per calendar month, no cron job for reset (ANS-07)
- Form shows loading state during submission
- Error messages display for all failure modes (limit reached, duplicate answer, auth required)
- Question page revalidates after successful answer submission

## Tasks

<task id="1" title="Create Server Action for answer submission">
Create `src/app/actions/answers.js` with the `submitAnswer` Server Action.

This action implements Layer 2 (server-side budget check) and Layer 3 (database function call) of the three-layer enforcement.

```javascript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitAnswer(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to answer.' }
  }

  const questionId = formData.get('questionId')
  const body = formData.get('body')?.trim()

  // Basic validation
  if (!questionId) {
    return { error: 'Missing question ID.' }
  }

  if (!body || body.length < 10) {
    return { error: 'Answer must be at least 10 characters.' }
  }

  if (body.length > 10000) {
    return { error: 'Answer must be under 10,000 characters.' }
  }

  // Layer 2: Server-side budget check (fast reject before DB function)
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString()

  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)
    .gte('created_at', startOfMonth)

  const { data: profile } = await supabase
    .from('profiles')
    .select('answer_limit')
    .eq('id', user.id)
    .single()

  if (count >= (profile?.answer_limit ?? 3)) {
    return { error: 'You have used all your answers this month.' }
  }

  // Layer 3: Database advisory lock function (absolute enforcement)
  const { data, error } = await supabase.rpc('submit_answer', {
    p_expert_id: user.id,
    p_question_id: questionId,
    p_body: body,
  })

  if (error) {
    if (error.message.includes('Monthly answer limit reached')) {
      return { error: 'You have used all your answers this month.' }
    }
    if (
      error.message.includes('duplicate key') ||
      error.message.includes('idx_answers_expert_question')
    ) {
      return { error: 'You have already answered this question.' }
    }
    return { error: 'Failed to submit answer. Please try again.' }
  }

  // Revalidate cached pages so the new answer appears
  revalidatePath('/')
  revalidatePath('/questions')

  // Revalidate the specific question page
  const { data: question } = await supabase
    .from('questions')
    .select('slug')
    .eq('id', questionId)
    .single()

  if (question?.slug) {
    revalidatePath(`/q/${question.slug}`)
  }

  return { success: true, answerId: data?.id }
}
```

Key details:
- `prevState` is the first parameter (required by `useActionState` — it receives the previous return value)
- `formData` is the second parameter (the form's submitted data)
- Layer 2 check uses `{ count: 'exact', head: true }` for an efficient count-only query
- Layer 3 calls `submit_answer()` via `.rpc()` which runs the advisory lock function from Plan 01
- On success, revalidates the homepage, archive, and the specific question page
- Returns `{ success: true, answerId }` on success or `{ error: 'message' }` on failure
</task>

<task id="2" title="Create BudgetIndicator client component">
Create `src/components/BudgetIndicator.jsx` — a Client Component that displays the expert's remaining answer budget.

```jsx
'use client'

export default function BudgetIndicator({ used, limit }) {
  const remaining = limit - used

  if (remaining <= 0) {
    return (
      <span className="text-xs font-medium text-red-600">
        0 answers remaining
      </span>
    )
  }

  return (
    <span className="text-xs font-medium text-warm-600">
      {remaining} of {limit} remaining
    </span>
  )
}
```

This is a simple display component. It receives `used` and `limit` as props from a Server Component parent.

Used in two places:
1. The site header (persistent reminder of budget status)
2. The answer form (contextual — shows before submission)
</task>

<task id="3" title="Create AnswerForm client component with draft auto-save" depends_on="1,2">
Create `src/components/AnswerForm.jsx` — the main answer submission form.

This is a Client Component (`'use client'`) because it needs:
- `useState` for content, word count, and draft management
- `useEffect` for localStorage draft persistence
- `useActionState` for Server Action form handling
- Event handlers for textarea changes

```jsx
'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { submitAnswer } from '@/app/actions/answers'
import BudgetIndicator from '@/components/BudgetIndicator'

export default function AnswerForm({ questionId, budgetUsed, budgetLimit, hasAnswered }) {
  const [state, formAction, pending] = useActionState(submitAnswer, null)
  const [content, setContent] = useState('')
  const draftKey = `ethos_draft_${questionId}`

  const remaining = budgetLimit - budgetUsed
  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0

  // Restore draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(draftKey)
    if (saved) setContent(saved)
  }, [draftKey])

  // Auto-save draft with 500ms debounce
  useEffect(() => {
    if (!content) {
      localStorage.removeItem(draftKey)
      return
    }
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, content)
    }, 500)
    return () => clearTimeout(timer)
  }, [content, draftKey])

  // Clear draft on successful submission
  useEffect(() => {
    if (state?.success) {
      localStorage.removeItem(draftKey)
      setContent('')
    }
  }, [state?.success, draftKey])

  // Already answered this question
  if (hasAnswered) {
    return (
      <div className="p-4 bg-warm-100 rounded-lg text-warm-600 text-sm">
        You have already answered this question.
      </div>
    )
  }

  // Budget exhausted (Layer 1: client UX enforcement)
  if (remaining <= 0) {
    return (
      <div className="p-4 bg-warm-100 rounded-lg">
        <p className="text-warm-600 text-sm">
          You have used all {budgetLimit} answers this month.
        </p>
        <p className="text-warm-500 text-xs mt-1">
          Your budget resets at the start of next month.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-warm-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-warm-800">
          Your answer
        </p>
        <BudgetIndicator used={budgetUsed} limit={budgetLimit} />
      </div>

      <form action={formAction}>
        <input type="hidden" name="questionId" value={questionId} />

        <textarea
          name="body"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your perspective..."
          rows={6}
          required
          minLength={10}
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300 resize-y"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-warm-400 space-x-3">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            {content && <span>· Draft saved</span>}
          </div>

          <button
            type="submit"
            disabled={pending || content.trim().length < 10}
            className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>

        {/* Error message */}
        {state?.error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {state.error}
          </p>
        )}

        {/* Success message */}
        {state?.success && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
            Answer submitted successfully.
          </p>
        )}
      </form>

      <p className="text-xs text-warm-400 mt-3">
        Submitting uses 1 of your {budgetLimit} monthly answers. This cannot be undone.
      </p>
    </div>
  )
}
```

Props:
- `questionId`: UUID string of the current question
- `budgetUsed`: number of answers the expert has submitted this month
- `budgetLimit`: the expert's monthly answer limit (from `profiles.answer_limit`)
- `hasAnswered`: boolean — whether the expert has already answered this specific question

Layer 1 enforcement:
- If `remaining <= 0`, the form is replaced with a "budget exhausted" message
- If `hasAnswered`, the form shows "already answered" message
- Submit button is disabled while `pending` or when content is too short

Draft auto-save:
- On mount, restores saved content from `localStorage` using key `ethos_draft_${questionId}`
- On content change, debounces 500ms then saves to `localStorage`
- On successful submission, clears the draft and content state
</task>

<task id="4" title="Update Header with auth state and budget indicator" depends_on="2">
Update `src/components/Header.jsx` to show authentication state and budget indicator for logged-in users.

The Header needs to become a hybrid: the layout is a Server Component, but the auth-aware parts (user name, budget indicator, login/logout buttons) need client-side state. Split into a Server Component shell that fetches data and a Client Component for interactive elements.

**`src/components/Header.jsx`** — Server Component shell:

```jsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HeaderAuth from '@/components/HeaderAuth'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let budgetData = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('answer_limit')
      .eq('id', user.id)
      .single()

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString()

    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('expert_id', user.id)
      .gte('created_at', startOfMonth)

    budgetData = {
      used: count ?? 0,
      limit: profile?.answer_limit ?? 3,
    }
  }

  return (
    <header className="border-b border-warm-200 bg-warm-50">
      <nav className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-warm-900">
          Ethos
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/questions"
            className="text-warm-600 hover:text-warm-900 text-sm font-medium"
          >
            Archive
          </Link>
          <HeaderAuth user={user} budgetData={budgetData} />
        </div>
      </nav>
    </header>
  )
}
```

**`src/components/HeaderAuth.jsx`** — Client Component for auth interactions:

```jsx
'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BudgetIndicator from '@/components/BudgetIndicator'

export default function HeaderAuth({ user, budgetData }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-warm-700 hover:text-warm-900"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {budgetData && (
        <BudgetIndicator used={budgetData.used} limit={budgetData.limit} />
      )}
      <button
        onClick={handleSignOut}
        className="text-sm text-warm-500 hover:text-warm-700"
      >
        Sign out
      </button>
    </div>
  )
}
```

Create the new `src/components/HeaderAuth.jsx` file. The Header component itself needs to be made async (it queries Supabase for user and budget data).

Key details:
- Header fetches user and budget data server-side (efficient, no client bundle cost)
- Passes data to HeaderAuth (Client Component) for interactive sign-out button
- Budget indicator shows in the header for constant awareness of the scarcity mechanic
- Sign out uses the browser Supabase client + `router.refresh()` to re-render server components
</task>

<task id="5" title="Integrate AnswerForm into question detail page" depends_on="3,4">
Update `src/app/q/[slug]/page.jsx` (created in Plan 02, Task 7) to include the AnswerForm for authenticated users.

The question detail page is a Server Component. It needs to:
1. Check if the user is authenticated
2. If yes, fetch their budget data and check if they've already answered
3. Render the AnswerForm Client Component with the appropriate props
4. If not authenticated, show a "Sign in to answer" prompt

Add the following logic to the existing question page, inserting the answer form between the question header and the answer list:

```jsx
// At the top of QuestionPage function, after fetching question and answers:

// Check if user is authenticated (for answer form)
const { data: { user } } = await supabase.auth.getUser()

let answerFormProps = null
if (user) {
  // Check if already answered this question
  const hasAnswered = (answers ?? []).some(
    a => a.profiles.id === user.id
  )

  // Get budget data
  const { data: profile } = await supabase
    .from('profiles')
    .select('answer_limit')
    .eq('id', user.id)
    .single()

  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString()

  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)
    .gte('created_at', startOfMonth)

  answerFormProps = {
    questionId: question.id,
    budgetUsed: count ?? 0,
    budgetLimit: profile?.answer_limit ?? 3,
    hasAnswered,
  }
}
```

Then in the JSX, between the question section and the answers section, add:

```jsx
{/* Answer form (authenticated users only) */}
{answerFormProps ? (
  <AnswerForm {...answerFormProps} />
) : (
  <div className="p-4 bg-warm-100 rounded-lg text-center">
    <p className="text-warm-600 text-sm">
      <Link href="/login" className="font-medium underline hover:text-warm-800">
        Sign in
      </Link>
      {' '}to share your answer.
    </p>
  </div>
)}
```

Import AnswerForm at the top:
```jsx
import AnswerForm from '@/components/AnswerForm'
```

This integration makes the question page work for three user types:
1. **Public visitor (not logged in):** Sees question + answers + "Sign in to answer" prompt
2. **Authenticated expert with budget remaining:** Sees question + answer form + answers
3. **Authenticated expert with budget exhausted:** Sees question + budget-exhausted message + answers
</task>

<task id="6" title="Update layout to use async Header" depends_on="4">
The updated Header component (Task 4) is now an async Server Component that queries Supabase. Verify that the root layout correctly renders it.

Check `src/app/layout.jsx` — the layout from Plan 02 Task 3 should already import and render `<Header />`. Since Next.js App Router supports async Server Components in layouts, no changes should be needed. Verify:

1. The import path is correct: `import Header from '@/components/Header'`
2. The layout renders `<Header />` before the `<main>` content
3. The app runs without errors: `npm run dev`

If there are issues with the async Header in the layout (e.g., if the layout was wrapped in a way that doesn't support async children), the fix is to use a `<Suspense>` boundary:

```jsx
import { Suspense } from 'react'

// In the layout body:
<Suspense fallback={<HeaderSkeleton />}>
  <Header />
</Suspense>
```

Where `HeaderSkeleton` is a minimal static header placeholder. However, this is unlikely to be needed — async Server Components work in layouts by default in Next.js 15.
</task>

<task id="7" title="End-to-end answer submission verification" depends_on="5,6">
Test the complete answer flow to verify all three enforcement layers and the full user experience.

**Prerequisites:**
- `npx supabase start` is running (local Supabase from Phase 1)
- `.env.local` has correct local Supabase URL and keys
- `npm run dev` is running
- At least one question exists (from seed data in Plan 02)
- A test user account exists (sign in via Google OAuth)

**Test sequence:**

1. **Public visitor experience:**
   - Visit the homepage without signing in
   - Verify today's question displays
   - Click through to `/q/[slug]`
   - Verify "Sign in to answer" prompt appears (no answer form)
   - Verify existing answers display correctly (if any)

2. **Answer submission (ANS-01):**
   - Sign in as a test user
   - Navigate to a question page
   - Verify the answer form appears with budget indicator
   - Type an answer (10+ characters)
   - Verify word count updates in real-time
   - Submit the answer
   - Verify: success message appears
   - Verify: the new answer appears in the answer list (page revalidated)
   - Verify: the answer card shows "chose to answer" signal
   - Verify: Markdown formatting renders correctly (try **bold**, *italic*, bullet list)

3. **Draft auto-save (ANS-04):**
   - Navigate to a different question page
   - Start typing an answer
   - Navigate away (click a link or close the tab)
   - Return to the same question page
   - Verify: the draft text is restored from localStorage
   - Submit the answer
   - Verify: the draft is cleared from localStorage

4. **Budget display (ANS-03):**
   - After submitting an answer, check the header budget indicator
   - Verify it shows the updated count (e.g., "2 of 3 remaining")
   - Navigate to another question page
   - Verify the answer form shows the same budget count

5. **Layer 1 — Client UX enforcement:**
   - Submit answers until the budget is exhausted (3 answers for free tier)
   - Navigate to a question page with no answer
   - Verify: the answer form is replaced with "budget exhausted" message
   - Verify: header budget indicator shows "0 answers remaining"

6. **Layer 2 — Server Action enforcement (ANS-02, ANS-07):**
   - (To test Layer 2 in isolation, you would need to bypass Layer 1 — e.g., manipulate the props or call the Server Action directly)
   - This layer provides a redundant check. The functional test in step 5 validates the end-to-end budget enforcement.

7. **Layer 3 — Database enforcement (ANS-02):**
   - Verify in Supabase Studio that the answer count matches expectations
   - Optional: from the SQL editor, try calling `submit_answer()` directly for a user at their limit:
     ```sql
     SELECT * FROM public.submit_answer('<user-uuid>', '<question-uuid>', 'Should be rejected');
     ```
     Verify: error "Monthly answer limit reached"

8. **Duplicate answer prevention:**
   - Navigate to a question you've already answered
   - Verify: the form shows "You have already answered this question"

9. **Budget reset (ANS-07):**
   - The budget counts answers where `created_at >= date_trunc('month', now())`
   - No cron job needed — the count naturally resets when the calendar month changes
   - Verify: the monthly count query in Supabase Studio matches the expected count

**If any test fails:** Check browser console for client errors, check the Supabase Dashboard for database errors, and verify the Server Action is receiving correct form data (add temporary `console.log` statements if needed).
</task>

## Verification

- [ ] Authenticated expert can submit an answer from the question page (ANS-01)
- [ ] Layer 1: Answer form disabled/hidden when budget is 0 (ANS-02)
- [ ] Layer 2: Server Action rejects over-limit submissions with user-friendly error (ANS-02)
- [ ] Layer 3: Database `submit_answer()` function rejects over-limit with advisory lock (ANS-02)
- [ ] Budget display shows "X of Y remaining" in header and answer form (ANS-03)
- [ ] Draft text persists in localStorage across page navigation (ANS-04)
- [ ] Draft text survives browser close and reopen (ANS-04)
- [ ] Draft cleared on successful submission (ANS-04)
- [ ] Free tier enforced at 3 answers per calendar month — no cron needed (ANS-07)
- [ ] Duplicate answer to same question is prevented with clear error message
- [ ] Form shows loading state ("Submitting...") during Server Action execution
- [ ] Question page revalidates after successful submission (new answer appears)
- [ ] Homepage revalidates to show updated answer count
- [ ] "Sign in to answer" prompt shown for unauthenticated visitors
- [ ] Answer form word count updates in real-time as user types
- [ ] Error messages display correctly for all failure modes
