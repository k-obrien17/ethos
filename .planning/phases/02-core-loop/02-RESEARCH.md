# Phase 2: Core Loop — Research

**Phase goal:** Build the daily question-to-answer-to-feed cycle — the product's central mechanic — so experts can answer questions within their budget and anyone can browse answers.

**Requirements:** QUES-01, QUES-02, QUES-03, QUES-04, ANS-01, ANS-02, ANS-03, ANS-04, ANS-05, ANS-06, ANS-07, ANS-08, FEED-01, FEED-03, FEED-04

---

## 1. Implementation Approach

### Strategy: Three Parallel Streams, Two Waves

Phase 2 builds the product's core loop on top of the Phase 1 foundation (Next.js project, Supabase schema, authentication). The work splits into three natural streams:

**Stream A: Database Extension**
- New migration: `submit_answer()` advisory lock function for race-condition-safe answer submission
- Word count computation in the function

**Stream B: Public Pages (Read Path)**
- Homepage with today's question and recent feed
- Question archive page
- Question detail page with all answers
- Individual answer page
- Answer card component with Markdown rendering and "chose to answer" signal
- Shared navigation header

**Stream C: Answer Submission (Write Path)**
- Answer form (Client Component) with textarea and word count
- Three-layer budget enforcement (client UX, Server Action, database)
- Budget display indicator
- Draft auto-save to localStorage
- ISR revalidation after submission

### Build Order

```
Wave 1 (parallel):
  Plan 01: submit_answer() migration (Stream A)   — ~30 min
  Plan 02: Public pages + answer display (Stream B) — ~3 hrs

Wave 2 (depends on both Wave 1 plans):
  Plan 03: Answer submission + budget enforcement (Stream C) — ~2 hrs
```

Plans 01 and 02 can execute in parallel — 01 produces SQL only, 02 produces page/component files. Plan 03 depends on both (uses the `submit_answer()` function from Plan 01 and renders into the page structure from Plan 02).

---

## 2. Technical Details

### 2.1 `submit_answer()` Advisory Lock Function

This is the database-layer enforcement of the monthly answer limit. It prevents race conditions where two simultaneous submissions could both pass an application-level count check.

```sql
CREATE OR REPLACE FUNCTION public.submit_answer(
  p_expert_id UUID,
  p_question_id UUID,
  p_body TEXT
) RETURNS public.answers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_limit INT;
  v_word_count INT;
  v_answer public.answers;
BEGIN
  -- Advisory lock on expert_id prevents concurrent submissions
  PERFORM pg_advisory_xact_lock(hashtext(p_expert_id::text));

  -- Get expert's answer limit
  SELECT answer_limit INTO v_limit
  FROM public.profiles WHERE id = p_expert_id;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Count answers this calendar month
  SELECT COUNT(*) INTO v_count
  FROM public.answers
  WHERE expert_id = p_expert_id
  AND created_at >= date_trunc('month', now());

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Monthly answer limit reached';
  END IF;

  -- Compute word count
  v_word_count := array_length(
    regexp_split_to_array(trim(p_body), '\s+'), 1
  );
  IF v_word_count IS NULL THEN v_word_count := 0; END IF;

  -- Insert the answer
  INSERT INTO public.answers (expert_id, question_id, body, word_count)
  VALUES (p_expert_id, p_question_id, p_body, v_word_count)
  RETURNING * INTO v_answer;

  RETURN v_answer;
END;
$$;
```

**Key design decisions:**
- `SECURITY DEFINER` so the function can read `profiles.answer_limit` and write to `answers` regardless of the calling user's RLS permissions
- `SET search_path = ''` for security (all table references fully qualified)
- `pg_advisory_xact_lock` is transaction-scoped — releases on commit/rollback
- Word count computed server-side to prevent client manipulation
- Returns the full `answers` row so the caller gets the new answer data

### 2.2 Calling `submit_answer()` from Supabase RPC

Supabase JS client supports calling Postgres functions via `.rpc()`:

```javascript
const { data, error } = await supabase.rpc('submit_answer', {
  p_expert_id: user.id,
  p_question_id: questionId,
  p_body: content,
})
```

The function runs as a single transaction. If the advisory lock blocks, the second caller waits. If the limit is exceeded, a Postgres exception is raised and Supabase returns it as an error with the exception message.

**Error handling pattern:**
```javascript
if (error) {
  if (error.message.includes('Monthly answer limit reached')) {
    return { error: 'You have used all your answers this month.' }
  }
  if (error.message.includes('duplicate key')) {
    return { error: 'You have already answered this question.' }
  }
  return { error: 'Failed to submit answer. Please try again.' }
}
```

### 2.3 Server Action for Answer Submission

Server Actions (React 19 + Next.js 15) replace API routes for mutations. Defined with `'use server'` in a separate file, callable from Client Components.

```javascript
// src/app/actions/answers.js
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

  if (!body || body.length < 10) {
    return { error: 'Answer must be at least 10 characters.' }
  }

  if (body.length > 10000) {
    return { error: 'Answer must be under 10,000 characters.' }
  }

  // Layer 2: Server-side budget check (fast reject before hitting DB function)
  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const { data: profile } = await supabase
    .from('profiles')
    .select('answer_limit')
    .eq('id', user.id)
    .single()

  if (count >= profile?.answer_limit) {
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
    if (error.message.includes('duplicate key') || error.message.includes('idx_answers_expert_question')) {
      return { error: 'You have already answered this question.' }
    }
    return { error: 'Failed to submit answer. Please try again.' }
  }

  // Revalidate cached pages
  revalidatePath('/')
  revalidatePath('/questions')

  // Look up the question slug for page-specific revalidation
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

**Three-layer enforcement summary:**
1. **Client UX (Plan 03):** AnswerForm disables submit when budget is 0. Prevents accidental clicks.
2. **Server Action (above):** Counts answers before calling RPC. Gives a fast, user-friendly error message.
3. **Database function (Plan 01):** Advisory lock + count check. Prevents race conditions.

### 2.4 `useActionState` for Form Handling

React 19 provides `useActionState` (renamed from `useFormState`) for handling Server Action responses in Client Components:

```javascript
'use client'
import { useActionState } from 'react'
import { submitAnswer } from '@/app/actions/answers'

function AnswerForm({ questionId, remainingBudget }) {
  const [state, formAction, pending] = useActionState(submitAnswer, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="questionId" value={questionId} />
      <textarea name="body" required minLength={10} />
      <button type="submit" disabled={pending || remainingBudget <= 0}>
        {pending ? 'Submitting...' : 'Submit Answer'}
      </button>
      {state?.error && <p className="text-red-600">{state.error}</p>}
      {state?.success && <p className="text-green-600">Answer submitted!</p>}
    </form>
  )
}
```

### 2.5 react-markdown for Answer Rendering

`react-markdown` v9+ is ESM-only and works in both Server Components and Client Components. Since answer cards are read-only display, render them as Server Components.

```bash
npm install react-markdown
```

```jsx
// Server Component — no 'use client' needed
import ReactMarkdown from 'react-markdown'

function AnswerBody({ content }) {
  return (
    <div className="prose prose-warm max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
```

**Note:** The `prose` classes from `@tailwindcss/typography` are optional. For beta, basic markdown rendering (paragraphs, bold, italic, links, lists) with custom Tailwind styles is sufficient. If `@tailwindcss/typography` is not installed, style the rendered elements manually.

### 2.6 Page Structure After Phase 2

```
src/
  app/
    page.jsx                    — Homepage: today's question + recent feed
    layout.jsx                  — Updated: includes navigation header
    q/
      [slug]/
        page.jsx                — Question detail + all answers + answer form
    questions/
      page.jsx                  — Question archive (chronological list)
    answers/
      [id]/
        page.jsx                — Individual answer with question context
    actions/
      answers.js                — Server Action: submitAnswer()
  components/
    Header.jsx                  — Navigation header (site name, budget indicator, auth)
    QuestionCard.jsx            — Question card for feed (body, answer count, date, link)
    AnswerCard.jsx              — Answer card (expert info, body, word count, "chose to answer")
    AnswerForm.jsx              — Client Component: textarea, submit, draft auto-save
    BudgetIndicator.jsx         — Client Component: "X of Y remaining this month"
```

### 2.7 Caching Strategy Per Route

| Route | Caching | Rationale |
|-------|---------|-----------|
| `/` (homepage) | `revalidate = 60` | Refreshes every minute; on-demand revalidation after answer submission |
| `/q/[slug]` (question detail) | No explicit caching (dynamic by default in Next.js 15) | Revalidated on-demand after answer submission via `revalidatePath` |
| `/questions` (archive) | `revalidate = 300` | 5-minute refresh; archive changes slowly |
| `/answers/[id]` (individual answer) | `revalidate = 3600` | Hourly; answers rarely change after submission |

### 2.8 Draft Auto-Save Pattern

Save in-progress answer text to localStorage with debouncing:

```javascript
// In AnswerForm Client Component
const [content, setContent] = useState('')
const draftKey = `ethos_draft_${questionId}`

// Restore draft on mount
useEffect(() => {
  const saved = localStorage.getItem(draftKey)
  if (saved) setContent(saved)
}, [draftKey])

// Save draft with 500ms debounce
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
```

### 2.9 "X Chose to Answer" Signal

On each answer card, display a subtle indicator showing the expert's selectivity:

```jsx
// Data needed: expert's answers this month and their answer limit
<p className="text-warm-500 text-sm">
  {expertName} chose to answer · {usedThisMonth} of {answerLimit} this month
</p>
```

This requires a join or subquery when fetching answers. The query for a question page:

```sql
SELECT
  a.*,
  p.display_name,
  p.handle,
  p.avatar_url,
  p.answer_limit,
  (
    SELECT COUNT(*)
    FROM answers a2
    WHERE a2.expert_id = a.expert_id
    AND a2.created_at >= date_trunc('month', a.created_at)
  ) AS monthly_answer_count
FROM answers a
JOIN profiles p ON p.id = a.expert_id
WHERE a.question_id = $1
ORDER BY a.created_at DESC;
```

In Supabase JS:

```javascript
const { data: answers } = await supabase
  .from('answers')
  .select(`
    *,
    profiles!inner (
      display_name,
      handle,
      avatar_url,
      answer_limit
    )
  `)
  .eq('question_id', questionId)
  .order('created_at', { ascending: false })
```

The monthly count can be fetched separately per expert or computed client-side from the answer data. For beta with small answer volumes, a separate query per card is acceptable.

### 2.10 Budget Display Data Flow

The budget indicator needs the user's current month answer count and their limit. This data flows through:

1. **Header (persistent):** Server Component fetches profile + monthly count on every page load. Passes to Client Component `BudgetIndicator`.
2. **Answer form (contextual):** Same data passed as props. Form disables when `remaining <= 0`.

```javascript
// In a Server Component (layout or page)
async function getBudgetData(userId) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('answer_limit')
    .eq('id', userId)
    .single()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', userId)
    .gte('created_at', startOfMonth.toISOString())

  return {
    used: count ?? 0,
    limit: profile?.answer_limit ?? 3,
  }
}
```

---

## 3. Gotchas

### 3.1 react-markdown ESM Import

`react-markdown` v9+ is ESM-only. If the Next.js configuration has issues with ESM packages, the workaround is to add it to `next.config.mjs` transpile list:

```javascript
// next.config.mjs (if needed)
const nextConfig = {
  transpilePackages: ['react-markdown'],
}
```

This is usually unnecessary with Next.js 15 which handles ESM well, but worth knowing if import errors appear.

### 3.2 Supabase RPC Error Messages

When the `submit_answer()` function raises an exception, Supabase wraps it in an error object. The original exception message is in `error.message`. Pattern match on substrings (not exact match) since Supabase may prepend context.

### 3.3 `revalidatePath` Only Works in Server Actions

`revalidatePath()` can only be called from Server Actions or Route Handlers, not from Client Components. The answer submission Server Action is the correct place to call it.

### 3.4 Monthly Budget Boundary

`date_trunc('month', now())` returns the first day of the current month at 00:00:00 UTC. This means the budget resets at midnight UTC, not the user's local timezone. For a US-focused beta, this means the reset happens at ~7pm ET / ~4pm PT on the last day of the month. Acceptable for beta; document if users ask.

### 3.5 Answer Cards Without Authentication

Public visitors (not logged in) see all answers but not the budget indicator or answer form. The page should work fully without authentication — only the interactive "answer" section requires login.

### 3.6 Next.js 15 Fetch Caching Default

Next.js 15 changed the default: `fetch` calls in Server Components are NOT cached by default (they were cached by default in Next.js 14). This means Supabase queries in Server Components will hit the database on every request unless you add `{ next: { revalidate: N } }` or use the `revalidate` page export. For Phase 2, this is actually desirable — we want fresh data. Use `export const revalidate = N` on pages where we want caching.

### 3.7 Question Slug Routing

Phase 1's schema uses `slug` on questions. The URL structure is `/q/[slug]`, not `/q/[id]`. This means:
- Question lookup uses `slug`, not `id`
- The `generateMetadata` function uses `params.slug`
- Shareable URLs look like: `/q/most-important-lesson-this-year` (human-readable)

### 3.8 Individual Answer Page URL

The requirements specify `/answers/[id]` (UUID-based) for individual answers. This is because answers don't have slugs — they're identified by UUID. The page shows the answer with its question context (question body, category, date).

---

## RESEARCH COMPLETE
