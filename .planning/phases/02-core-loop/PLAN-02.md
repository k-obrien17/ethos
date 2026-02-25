---
phase: 2
plan: "02"
title: "Public pages — homepage, question feed, question detail, answer display"
wave: 1
depends_on: []
requirements: ["QUES-01", "QUES-02", "QUES-03", "QUES-04", "ANS-05", "ANS-06", "ANS-08", "FEED-01", "FEED-03", "FEED-04"]
files_modified:
  - "src/app/page.jsx"
  - "src/app/layout.jsx"
  - "src/app/q/[slug]/page.jsx"
  - "src/app/questions/page.jsx"
  - "src/app/answers/[id]/page.jsx"
  - "src/components/Header.jsx"
  - "src/components/QuestionCard.jsx"
  - "src/components/AnswerCard.jsx"
  - "package.json"
autonomous: true
estimated_tasks: 8
---

# Plan 02: Public pages — homepage, question feed, question detail, answer display

## Objective

Build all the public read-only pages that form the browsing experience: the homepage showing today's question with current answers, a chronological question archive, individual question pages with all expert answers displayed below, and individual answer pages for shareable URLs. All pages are Server Components for SEO and performance. All content is publicly readable without authentication. Install `react-markdown` for answer rendering and create reusable card components.

## must_haves

- Homepage shows today's question prominently based on `publish_date = CURRENT_DATE`
- Homepage shows recent past questions with answer counts below today's question
- Question archive at `/questions` lists all published questions chronologically with answer counts
- Question detail at `/q/[slug]` shows the question body, category, date, and all expert answers
- Individual answer page at `/answers/[id]` shows one answer with its question context
- Answer cards display: expert name, avatar, answer body (Markdown rendered), word count, and "X chose to answer" signal
- All pages are accessible without authentication (public read, FEED-04)
- Navigation header with site name and links to home and archive
- Each question has a shareable URL at `/q/[slug]` (QUES-04)
- Each answer has a shareable URL at `/answers/[id]` (ANS-05)

## Tasks

<task id="1" title="Install react-markdown and date-fns">
Install the packages needed for answer rendering and date formatting.

```bash
npm install react-markdown date-fns
```

**react-markdown** (~9.0+): Renders Markdown as React elements. ESM-only, works in Server Components. Used for answer body rendering.

**date-fns** (~4.1+): Lightweight date formatting. Used for "Published 3 days ago" relative dates and "February 25, 2026" display formatting.

Verify both appear in `package.json` dependencies after install.
</task>

<task id="2" title="Create navigation Header component" depends_on="1">
Create `src/components/Header.jsx` — a Server Component that renders the site navigation header.

```jsx
import Link from 'next/link'

export default function Header() {
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
        </div>
      </nav>
    </header>
  )
}
```

Design notes:
- Max width `max-w-2xl` (672px) — content-focused, narrow layout appropriate for a reading experience
- Warm palette colors from Phase 1's globals.css
- Auth-aware elements (budget indicator, login/sign out) will be added in Plan 03 — keep this pure Server Component for now
- The header will be included in the root layout (Task 3)
</task>

<task id="3" title="Update root layout to include Header" depends_on="2">
Update `src/app/layout.jsx` to include the navigation header on all pages.

The root layout from Phase 1 has the basic structure (Inter font, warm palette, metadata). Add the Header component:

```jsx
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Ethos',
  description: 'What you choose to answer reveals what you stand for.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-warm-50 text-warm-900 antialiased min-h-screen">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
```

Key changes from Phase 1:
- Import and render `<Header />` above the main content
- Wrap `{children}` in a `<main>` tag with consistent max-width and padding
- Add `min-h-screen` to body for full viewport coverage
</task>

<task id="4" title="Create QuestionCard component" depends_on="1">
Create `src/components/QuestionCard.jsx` — a Server Component that renders a question in the feed.

Used on the homepage and archive page. Shows: question body, category badge, publish date, answer count, and link to the full question page.

```jsx
import Link from 'next/link'
import { format } from 'date-fns'

export default function QuestionCard({ question, answerCount }) {
  return (
    <Link
      href={`/q/${question.slug}`}
      className="block p-6 bg-white rounded-lg border border-warm-200 hover:border-warm-400 transition-colors"
    >
      {question.category && (
        <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
          {question.category}
        </span>
      )}
      <h2 className="text-lg font-semibold text-warm-900 mt-1">
        {question.body}
      </h2>
      <div className="flex items-center gap-3 mt-3 text-sm text-warm-500">
        <span>{format(new Date(question.publish_date), 'MMM d, yyyy')}</span>
        <span>·</span>
        <span>
          {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
        </span>
      </div>
    </Link>
  )
}
```

Props:
- `question`: object with `{ slug, body, category, publish_date }`
- `answerCount`: number (count of answers for this question)
</task>

<task id="5" title="Create AnswerCard component with Markdown rendering" depends_on="1">
Create `src/components/AnswerCard.jsx` — a Server Component that renders a single expert answer.

Shows: expert avatar, name (linked to future profile page), answer body rendered as Markdown, word count, and the "X chose to answer" signal.

```jsx
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

export default function AnswerCard({ answer, expert, monthlyUsage }) {
  return (
    <article
      id={`answer-${answer.id}`}
      className="p-6 bg-white rounded-lg border border-warm-200"
    >
      {/* Expert info */}
      <div className="flex items-center gap-3 mb-4">
        {expert.avatar_url ? (
          <img
            src={expert.avatar_url}
            alt={expert.display_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-warm-200 flex items-center justify-center text-warm-600 font-medium text-sm">
            {expert.display_name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium text-warm-900">
            {expert.display_name}
          </p>
          <p className="text-xs text-warm-500">
            {expert.display_name} chose to answer
            {monthlyUsage != null && expert.answer_limit != null && (
              <> · {monthlyUsage} of {expert.answer_limit} this month</>
            )}
          </p>
        </div>
      </div>

      {/* Answer body — Markdown rendered */}
      <div className="text-warm-800 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:text-warm-700 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mb-1">
        <ReactMarkdown>{answer.body}</ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-warm-100 text-xs text-warm-400">
        <span>{answer.word_count} words</span>
        <Link
          href={`/answers/${answer.id}`}
          className="hover:text-warm-600"
        >
          Link
        </Link>
      </div>
    </article>
  )
}
```

Props:
- `answer`: object with `{ id, body, word_count, created_at }`
- `expert`: object with `{ display_name, handle, avatar_url, answer_limit }`
- `monthlyUsage`: number or null (expert's answer count this month, for "X of Y" signal)

Design notes:
- Custom Tailwind selectors (`[&_p]`, `[&_strong]`, etc.) style Markdown output without requiring `@tailwindcss/typography`. This keeps dependencies minimal.
- The "chose to answer" signal is the key differentiator — it surfaces the selectivity mechanic on every answer.
- Avatar fallback shows the first letter of the display name in a colored circle.
- The answer `id` is used as an anchor (`#answer-{uuid}`) for direct linking from other pages.
</task>

<task id="6" title="Build homepage — today's question + recent feed" depends_on="3,4,5">
Replace the Phase 1 placeholder `src/app/page.jsx` with the real homepage.

The homepage is a Server Component that:
1. Fetches today's question (where `publish_date = CURRENT_DATE`)
2. Fetches today's answers (if any)
3. Fetches recent past questions with answer counts
4. Renders today's question prominently at the top, with answer cards below
5. Lists recent questions as a feed below

```jsx
import { createClient } from '@/lib/supabase/server'
import QuestionCard from '@/components/QuestionCard'
import AnswerCard from '@/components/AnswerCard'
import Link from 'next/link'

export const revalidate = 60  // Revalidate every 60 seconds

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch today's question
  const { data: todayQuestion } = await supabase
    .from('questions')
    .select('*')
    .lte('publish_date', new Date().toISOString().slice(0, 10))
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })
    .limit(1)
    .single()

  // Fetch answers for today's question (with expert profiles)
  let todayAnswers = []
  if (todayQuestion) {
    const { data } = await supabase
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
      .eq('question_id', todayQuestion.id)
      .order('created_at', { ascending: false })

    todayAnswers = data ?? []
  }

  // Fetch recent past questions with answer counts
  const { data: recentQuestions } = await supabase
    .from('questions')
    .select('*, answers(count)')
    .lt('publish_date', new Date().toISOString().slice(0, 10))
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      {/* Today's question */}
      {todayQuestion ? (
        <section>
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-2">
            Today's Question
          </p>
          <div className="p-6 bg-white rounded-lg border-2 border-warm-300">
            {todayQuestion.category && (
              <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                {todayQuestion.category}
              </span>
            )}
            <h1 className="text-2xl font-bold text-warm-900 mt-1">
              {todayQuestion.body}
            </h1>
            <p className="text-sm text-warm-500 mt-3">
              {todayAnswers.length} {todayAnswers.length === 1 ? 'expert has' : 'experts have'} answered
            </p>
          </div>

          {/* Today's answers */}
          {todayAnswers.length > 0 && (
            <div className="mt-6 space-y-4">
              {todayAnswers.map((answer) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  expert={answer.profiles}
                  monthlyUsage={null}
                />
              ))}
            </div>
          )}

          {todayAnswers.length === 0 && (
            <p className="mt-4 text-warm-500 text-sm">
              No answers yet. Be the first expert to weigh in.
            </p>
          )}
        </section>
      ) : (
        <section className="text-center py-12">
          <h1 className="text-2xl font-bold text-warm-900 mb-2">Ethos</h1>
          <p className="text-warm-600">
            What you choose to answer reveals what you stand for.
          </p>
          <p className="text-warm-500 text-sm mt-2">
            No question published yet today. Check back soon.
          </p>
        </section>
      )}

      {/* Recent questions feed */}
      {recentQuestions && recentQuestions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-warm-800">
              Recent Questions
            </h2>
            <Link
              href="/questions"
              className="text-sm text-warm-500 hover:text-warm-700"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answerCount={q.answers?.[0]?.count ?? 0}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

**Data queries:**
- Today's question: `publish_date <= CURRENT_DATE` + `status IN ('scheduled', 'published')` + order by date desc + limit 1. This ensures the most recently published question shows as "today's" even if today has none.
- Today's answers: joined with `profiles` for expert data.
- Recent questions: `publish_date < today`, ordered by date desc, limited to 10. Uses Supabase's aggregate syntax `answers(count)` to get answer counts without a separate query.

**Note on monthly usage:** The `monthlyUsage` prop on AnswerCard is passed as `null` on the homepage for now. Computing monthly usage for every expert on every answer card adds query complexity. The "X of Y this month" signal will show on the detailed question page (Task 7) where there are fewer cards and the additional queries are justified.
</task>

<task id="7" title="Build question detail page with answers" depends_on="5,6">
Create `src/app/q/[slug]/page.jsx` — the question detail page showing the full question and all expert answers.

This page:
1. Fetches the question by slug
2. Fetches all answers with expert profiles and monthly usage
3. Generates metadata for SEO and sharing
4. Renders the question prominently, then answer cards below
5. Shows answer count and "chose to answer" signals

```jsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import AnswerCard from '@/components/AnswerCard'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: question } = await supabase
    .from('questions')
    .select('body, category')
    .eq('slug', slug)
    .single()

  if (!question) return { title: 'Question not found' }

  return {
    title: `${question.body} — Ethos`,
    description: question.category
      ? `${question.category} question on Ethos`
      : 'Expert answers on Ethos',
  }
}

export default async function QuestionPage({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch question by slug
  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!question) notFound()

  // Fetch answers with expert profiles
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

  // Fetch monthly usage for each expert who answered
  // (For "X of Y this month" signal)
  const expertIds = [...new Set((answers ?? []).map(a => a.profiles.id))]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  let monthlyUsageMap = {}
  if (expertIds.length > 0) {
    const { data: usageCounts } = await supabase
      .from('answers')
      .select('expert_id')
      .in('expert_id', expertIds)
      .gte('created_at', startOfMonth)

    // Count per expert
    monthlyUsageMap = (usageCounts ?? []).reduce((acc, row) => {
      acc[row.expert_id] = (acc[row.expert_id] || 0) + 1
      return acc
    }, {})
  }

  const answerCount = answers?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Question */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          {question.category && (
            <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
              {question.category}
            </span>
          )}
          <span className="text-xs text-warm-400">
            {format(new Date(question.publish_date), 'MMMM d, yyyy')}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-warm-900">
          {question.body}
        </h1>
        <p className="text-sm text-warm-500 mt-3">
          {answerCount} {answerCount === 1 ? 'expert' : 'experts'} chose to answer
        </p>
      </section>

      {/* Answer form placeholder — will be added in Plan 03 */}

      {/* Answers */}
      {answerCount > 0 ? (
        <section className="space-y-4">
          {answers.map((answer) => (
            <AnswerCard
              key={answer.id}
              answer={answer}
              expert={answer.profiles}
              monthlyUsage={monthlyUsageMap[answer.profiles.id] ?? null}
            />
          ))}
        </section>
      ) : (
        <p className="text-warm-500 text-sm py-8 text-center">
          No answers yet. Be the first expert to weigh in.
        </p>
      )}
    </div>
  )
}
```

Key implementation details:
- **Monthly usage query:** Fetches all answers this month for the answering experts in a single query, then counts per expert in JS. This is efficient for small answer volumes (beta with 20-50 experts).
- **`generateMetadata`:** Provides title and description for SEO and social sharing. OG image generation is deferred to Phase 5.
- **`notFound()`:** Returns a 404 page if the slug doesn't match any question.
- **Answer ordering:** Newest first (`created_at DESC`). Could be changed to oldest-first if editorial preference differs.
- **Answer form placeholder:** A comment marks where Plan 03 will add the interactive answer form.
</task>

<task id="8" title="Build question archive and individual answer page" depends_on="4,5">
Create two pages:

**`src/app/questions/page.jsx`** — Question archive page showing all published questions chronologically.

```jsx
import { createClient } from '@/lib/supabase/server'
import QuestionCard from '@/components/QuestionCard'

export const revalidate = 300  // Revalidate every 5 minutes

export const metadata = {
  title: 'Questions — Ethos',
  description: 'Browse all expert questions on Ethos.',
}

export default async function QuestionsPage() {
  const supabase = await createClient()

  const { data: questions } = await supabase
    .from('questions')
    .select('*, answers(count)')
    .lte('publish_date', new Date().toISOString().slice(0, 10))
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-6">
        All Questions
      </h1>
      {questions && questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              answerCount={q.answers?.[0]?.count ?? 0}
            />
          ))}
        </div>
      ) : (
        <p className="text-warm-500 text-sm text-center py-8">
          No questions published yet.
        </p>
      )}
    </div>
  )
}
```

**`src/app/answers/[id]/page.jsx`** — Individual answer page for shareable URLs.

Shows the answer with its question context. This page allows sharing a specific answer on social platforms.

```jsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import AnswerCard from '@/components/AnswerCard'

export const revalidate = 3600  // Revalidate every hour

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: answer } = await supabase
    .from('answers')
    .select(`
      body,
      profiles!inner ( display_name ),
      questions!inner ( body )
    `)
    .eq('id', id)
    .single()

  if (!answer) return { title: 'Answer not found' }

  const excerpt = answer.body.slice(0, 150) + (answer.body.length > 150 ? '...' : '')

  return {
    title: `${answer.profiles.display_name} on "${answer.questions.body}" — Ethos`,
    description: excerpt,
  }
}

export default async function AnswerPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch answer with expert profile and question context
  const { data: answer } = await supabase
    .from('answers')
    .select(`
      *,
      profiles!inner (
        id,
        display_name,
        handle,
        avatar_url,
        answer_limit
      ),
      questions!inner (
        id,
        body,
        slug,
        category,
        publish_date
      )
    `)
    .eq('id', id)
    .single()

  if (!answer) notFound()

  return (
    <div className="space-y-6">
      {/* Question context */}
      <div>
        <Link
          href={`/q/${answer.questions.slug}`}
          className="text-sm text-warm-500 hover:text-warm-700"
        >
          ← Back to question
        </Link>
        <div className="mt-3 p-4 bg-warm-100 rounded-lg">
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide">
            {answer.questions.category && `${answer.questions.category} · `}
            {format(new Date(answer.questions.publish_date), 'MMMM d, yyyy')}
          </p>
          <p className="text-lg font-semibold text-warm-900 mt-1">
            {answer.questions.body}
          </p>
        </div>
      </div>

      {/* The answer */}
      <AnswerCard
        answer={answer}
        expert={answer.profiles}
        monthlyUsage={null}
      />

      {/* Link to see all answers */}
      <div className="text-center">
        <Link
          href={`/q/${answer.questions.slug}`}
          className="text-sm text-warm-600 hover:text-warm-800"
        >
          See all answers to this question →
        </Link>
      </div>
    </div>
  )
}
```

Key details:
- The answer page shows the question as context (warm background card) with the answer below.
- `generateMetadata` creates SEO-friendly title/description using the expert name and question body.
- Links back to the full question page encourage visitors to explore other answers.
- `revalidate = 3600` (hourly) since individual answers rarely change after submission.
</task>

## Verification

- [ ] `react-markdown` and `date-fns` are in `package.json` dependencies
- [ ] Homepage shows today's question (the most recently published question with `publish_date <= today`)
- [ ] Homepage shows recent past questions with answer counts below today's question
- [ ] Homepage is accessible without authentication (FEED-04)
- [ ] `/questions` shows all published questions in reverse chronological order with answer counts
- [ ] `/q/[slug]` shows a question with all expert answers below (FEED-01)
- [ ] `/q/[slug]` returns 404 for non-existent slugs
- [ ] Answer cards render Markdown correctly (bold, italic, links, lists) (ANS-06)
- [ ] Answer cards show expert name, avatar (or fallback initial), and word count
- [ ] Answer cards show "X chose to answer" signal (ANS-08)
- [ ] `/answers/[id]` shows a single answer with question context (ANS-05)
- [ ] `/answers/[id]` has correct metadata for social sharing (title, description)
- [ ] Navigation header appears on all pages with links to home and archive
- [ ] All pages render correctly with no seed data (empty states)
- [ ] All pages render correctly with seed data (questions + answers)
- [ ] `export const revalidate` is set appropriately on each page
