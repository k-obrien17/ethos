---
phase: 4
plan: "02"
title: "Question CRUD — Server Actions, form component, admin pages"
wave: 1
depends_on: []
requirements: ["ADMN-01", "ADMN-03", "ADMN-04"]
files_modified:
  - "src/app/actions/questions.js"
  - "src/components/admin/QuestionForm.jsx"
  - "src/app/admin/questions/page.jsx"
  - "src/app/admin/questions/new/page.jsx"
  - "src/app/admin/questions/[id]/edit/page.jsx"
  - "src/app/admin/layout.jsx"
autonomous: true
estimated_tasks: 6
---

# Plan 02: Question CRUD — Server Actions, form component, admin pages

## Objective

Build the question management system: Server Actions for creating, editing, and deleting questions, a reusable form component, and admin pages for listing/creating/editing questions. This gives the editorial team full control over the question pipeline. Wave 1 — no dependencies.

## must_haves

- Admin can create a question with body, category, publish_date, and status (ADMN-01)
- Slug auto-generated from body text, editable by admin
- Admin can edit unpublished/scheduled questions (ADMN-03)
- Admin can delete unpublished questions (ADMN-03)
- Admin question list shows all questions (drafts, scheduled, published) with status badges
- Form validates: body required, slug unique, publish_date required if status is 'scheduled'
- Multiple admins can use all features (ADMN-04 — inherent in existing role system)
- `created_by` set to current admin's user ID on creation

## Tasks

<task id="1" title="Create question management Server Actions">
Create `src/app/actions/questions.js` with three Server Actions:

```javascript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function generateSlug(body) {
  return body
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

export async function createQuestion(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const body = formData.get('body')?.trim()
  const slug = formData.get('slug')?.trim()?.toLowerCase() || generateSlug(body)
  const category = formData.get('category')?.trim() || null
  const publishDate = formData.get('publish_date') || null
  const status = formData.get('status') || 'draft'

  // Validate
  if (!body || body.length < 10) return { error: 'Question must be at least 10 characters.' }
  if (body.length > 500) return { error: 'Question must be under 500 characters.' }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { error: 'Slug must contain only lowercase letters, numbers, and hyphens.' }
  if (slug.length < 3 || slug.length > 80) return { error: 'Slug must be 3-80 characters.' }
  if (status === 'scheduled' && !publishDate) return { error: 'Scheduled questions need a publish date.' }
  if (!['draft', 'scheduled', 'published'].includes(status)) return { error: 'Invalid status.' }

  const { data, error } = await supabase
    .from('questions')
    .insert({
      body,
      slug,
      category,
      publish_date: publishDate,
      status,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('questions_slug_key') || error.message.includes('duplicate key')) {
      return { error: 'That slug is already taken.' }
    }
    return { error: 'Failed to create question.' }
  }

  revalidatePath('/admin/questions')
  revalidatePath('/questions')
  revalidatePath('/')
  redirect('/admin/questions')
}

export async function updateQuestion(prevState, formData) {
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
  const body = formData.get('body')?.trim()
  const slug = formData.get('slug')?.trim()?.toLowerCase()
  const category = formData.get('category')?.trim() || null
  const publishDate = formData.get('publish_date') || null
  const status = formData.get('status') || 'draft'

  if (!questionId) return { error: 'Question ID required.' }
  if (!body || body.length < 10) return { error: 'Question must be at least 10 characters.' }
  if (body.length > 500) return { error: 'Question must be under 500 characters.' }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { error: 'Slug must contain only lowercase letters, numbers, and hyphens.' }
  if (slug.length < 3 || slug.length > 80) return { error: 'Slug must be 3-80 characters.' }
  if (status === 'scheduled' && !publishDate) return { error: 'Scheduled questions need a publish date.' }

  // Get old slug for revalidation
  const { data: oldQuestion } = await supabase
    .from('questions')
    .select('slug')
    .eq('id', questionId)
    .single()

  const { error } = await supabase
    .from('questions')
    .update({ body, slug, category, publish_date: publishDate, status })
    .eq('id', questionId)

  if (error) {
    if (error.message.includes('questions_slug_key') || error.message.includes('duplicate key')) {
      return { error: 'That slug is already taken.' }
    }
    return { error: 'Failed to update question.' }
  }

  revalidatePath('/admin/questions')
  revalidatePath(`/q/${slug}`)
  if (oldQuestion?.slug && oldQuestion.slug !== slug) {
    revalidatePath(`/q/${oldQuestion.slug}`)
  }
  revalidatePath('/questions')
  revalidatePath('/')

  return { success: true }
}

export async function deleteQuestion(questionId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  // Get question details for revalidation
  const { data: question } = await supabase
    .from('questions')
    .select('slug, status')
    .eq('id', questionId)
    .single()

  // Only allow deleting draft/scheduled questions
  if (question?.status === 'published') {
    return { error: 'Cannot delete published questions. Change status to draft first.' }
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)

  if (error) return { error: 'Failed to delete question.' }

  revalidatePath('/admin/questions')
  revalidatePath('/questions')
  revalidatePath('/')
  if (question?.slug) revalidatePath(`/q/${question.slug}`)

  return { success: true }
}
```

Key details:
- `createQuestion` uses `redirect()` after success (common for create flows)
- `updateQuestion` returns `{ success: true }` (stays on edit page)
- `deleteQuestion` is a plain async function (not form action) — called from a button handler
- Admin role verified server-side in every action (defense in depth beyond middleware)
- Slug auto-generated if not provided, but editable
- Published questions cannot be deleted (must change status to draft first)
- `created_by` tracks which admin created the question
</task>

<task id="2" title="Create QuestionForm component">
Create `src/components/admin/QuestionForm.jsx` — a Client Component form for creating and editing questions.

```jsx
'use client'

import { useState, useActionState } from 'react'
import { createQuestion, updateQuestion } from '@/app/actions/questions'

export default function QuestionForm({ question }) {
  const isEdit = !!question
  const action = isEdit ? updateQuestion : createQuestion
  const [state, formAction, pending] = useActionState(action, null)

  const [body, setBody] = useState(question?.body ?? '')
  const [slug, setSlug] = useState(question?.slug ?? '')

  function handleBodyChange(e) {
    const newBody = e.target.value
    setBody(newBody)
    // Auto-generate slug from body if creating new and slug hasn't been manually edited
    if (!isEdit && !slugManuallyEdited) {
      setSlug(generateSlug(newBody))
    }
  }

  // ... slug generation, status selector (draft/scheduled/published),
  // category input, publish_date date picker, submit button with pending state,
  // error/success messages from state
}
```

Props:
- `question`: existing question object for edit mode, or undefined for create mode

Fields:
- body (textarea, required, 10-500 chars)
- slug (text input, auto-generated from body, editable, 3-80 chars, lowercase alphanumeric + hyphens)
- category (text input, optional)
- publish_date (date input, required if status is 'scheduled')
- status (select: draft, scheduled, published)
- Hidden input: question_id (for edit mode)

Features:
- Slug auto-generates as admin types question body (create mode only)
- Slug auto-strips invalid characters
- Status selector with visual badges
- publish_date input shows/required based on status
- Loading state during submission
- Error and success messages
</task>

<task id="3" title="Create admin question list page">
Create `src/app/admin/questions/page.jsx` — Server Component listing all questions.

```jsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import DeleteQuestionButton from '@/components/admin/DeleteQuestionButton'

export const metadata = { title: 'Questions — Admin — Ethos' }

export default async function AdminQuestionsPage() {
  const supabase = await createClient()

  const { data: questions } = await supabase
    .from('questions')
    .select('*, answers(count)')
    .order('publish_date', { ascending: false, nullsFirst: true })

  // Group: drafts (no date), upcoming (scheduled, date >= today), past (published or date < today)
  // Render three sections with status badges, edit links, delete buttons

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-900">Questions</h1>
        <Link href="/admin/questions/new" className="...">
          New Question
        </Link>
      </div>

      {/* Draft questions */}
      {/* Upcoming scheduled questions */}
      {/* Past/published questions */}
    </div>
  )
}
```

Features:
- All questions visible (admin RLS shows drafts too)
- Grouped into: Drafts (no publish_date), Upcoming (future dates), Past (published)
- Status badges: draft (gray), scheduled (amber), published (green)
- Answer count per question
- Edit link → `/admin/questions/[id]/edit`
- Delete button (Client Component) for draft/scheduled questions only
- "New Question" button links to create page
</task>

<task id="4" title="Create DeleteQuestionButton component">
Create `src/components/admin/DeleteQuestionButton.jsx` — a Client Component that calls `deleteQuestion()` with confirmation.

```jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteQuestion } from '@/app/actions/questions'

export default function DeleteQuestionButton({ questionId, questionBody }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete "${questionBody.slice(0, 60)}..."?`)) return
    setPending(true)
    const result = await deleteQuestion(questionId)
    if (result?.error) {
      alert(result.error)
      setPending(false)
    } else {
      router.refresh()
    }
  }

  return (
    <button onClick={handleDelete} disabled={pending} className="...">
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
```
</task>

<task id="5" title="Create question create and edit pages">
Create two admin pages:

**`src/app/admin/questions/new/page.jsx`** — Create form:
```jsx
import QuestionForm from '@/components/admin/QuestionForm'

export const metadata = { title: 'New Question — Admin — Ethos' }

export default function NewQuestionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-6">New Question</h1>
      <QuestionForm />
    </div>
  )
}
```

**`src/app/admin/questions/[id]/edit/page.jsx`** — Edit form:
```jsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import QuestionForm from '@/components/admin/QuestionForm'

export const metadata = { title: 'Edit Question — Admin — Ethos' }

export default async function EditQuestionPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()

  if (!question) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-6">Edit Question</h1>
      <QuestionForm question={question} />
    </div>
  )
}
```
</task>

<task id="6" title="Update admin layout with navigation">
Update `src/app/admin/layout.jsx` to include admin navigation links (Questions, Answers) and a link back to the main site.

```jsx
// Add nav bar below the role check:
<nav className="flex items-center gap-4 mb-8 border-b border-warm-200 pb-4">
  <Link href="/admin" className="text-sm font-medium text-warm-700 hover:text-warm-900">
    Dashboard
  </Link>
  <Link href="/admin/questions" className="text-sm font-medium text-warm-700 hover:text-warm-900">
    Questions
  </Link>
  <Link href="/admin/answers" className="text-sm font-medium text-warm-700 hover:text-warm-900">
    Answers
  </Link>
  <div className="flex-1" />
  <Link href="/" className="text-xs text-warm-400 hover:text-warm-600">
    ← Back to site
  </Link>
</nav>
```
</task>

## Verification

- [ ] Admin can create a question with body, category, publish_date, and status (ADMN-01)
- [ ] Slug auto-generates from question body
- [ ] Slug uniqueness enforced with friendly error message
- [ ] Admin can edit unpublished/scheduled questions (ADMN-03)
- [ ] Admin can delete draft/scheduled questions (ADMN-03)
- [ ] Published questions cannot be deleted (must change status first)
- [ ] Question list shows all statuses with badges (draft/scheduled/published)
- [ ] Multiple admins can access all features (ADMN-04)
- [ ] `created_by` is set to current admin's user ID
- [ ] `npm run build` succeeds
