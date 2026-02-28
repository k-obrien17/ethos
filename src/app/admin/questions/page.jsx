import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import DeleteQuestionButton from '@/components/admin/DeleteQuestionButton'

export const metadata = { title: 'Questions — Admin' }

function StatusBadge({ status }) {
  const classes = {
    draft: 'bg-warm-100 text-warm-600',
    scheduled: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes[status] || classes.draft}`}>
      {status}
    </span>
  )
}

function QuestionRow({ question }) {
  const canDelete = question.status !== 'published'
  const topics = question.question_topics?.map((qt) => qt.topics).filter(Boolean) ?? []

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-warm-100 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-warm-900 leading-snug">
          {question.body}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <StatusBadge status={question.status} />
          {question.category && (
            <span className="text-xs text-warm-500">{question.category}</span>
          )}
          {topics.length > 0 && (
            <span className="flex items-center gap-1">
              {topics.map((topic) => (
                <span
                  key={topic.slug}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-500 font-medium"
                >
                  {topic.name}
                </span>
              ))}
            </span>
          )}
          {question.publish_date && (
            <span className="text-xs text-warm-400">
              {format(new Date(question.publish_date), 'MMM d, yyyy')}
            </span>
          )}
          <span className="text-xs text-warm-400">
            {question.answers?.[0]?.count ?? 0} answers
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={`/admin/questions/${question.id}/edit`}
          className="text-xs text-warm-500 hover:text-warm-700 transition-colors"
        >
          Edit
        </Link>
        {canDelete && (
          <DeleteQuestionButton
            questionId={question.id}
            questionBody={question.body}
          />
        )}
      </div>
    </div>
  )
}

function QuestionSection({ title, questions }) {
  if (questions.length === 0) return null

  return (
    <div>
      <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
        {title} ({questions.length})
      </h2>
      <div className="bg-white border border-warm-200 rounded-lg px-4">
        {questions.map((q) => (
          <QuestionRow key={q.id} question={q} />
        ))}
      </div>
    </div>
  )
}

export default async function AdminQuestionsPage() {
  const supabase = await createClient()

  const { data: questions } = await supabase
    .from('questions')
    .select('*, answers(count), question_topics(topics(name, slug))')
    .order('publish_date', { ascending: false, nullsFirst: true })

  const allQuestions = questions || []
  const today = new Date().toISOString().split('T')[0]

  const drafts = allQuestions.filter((q) => q.status === 'draft')
  const upcoming = allQuestions.filter(
    (q) => q.status === 'scheduled' && q.publish_date && q.publish_date >= today
  )
  const past = allQuestions.filter(
    (q) => q.status === 'published' || (q.status === 'scheduled' && q.publish_date && q.publish_date < today)
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-900">Questions</h1>
        <Link
          href="/admin/questions/new"
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          New Question
        </Link>
      </div>

      {allQuestions.length === 0 && (
        <p className="text-warm-500 text-sm">
          No questions yet. Create your first question to get started.
        </p>
      )}

      <QuestionSection title="Drafts" questions={drafts} />
      <QuestionSection title="Upcoming" questions={upcoming} />
      <QuestionSection title="Past" questions={past} />
    </div>
  )
}
