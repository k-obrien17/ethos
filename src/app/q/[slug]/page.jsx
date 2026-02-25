import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import AnswerCard from '@/components/AnswerCard'
import AnswerForm from '@/components/AnswerForm'

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
  const expertIds = [...new Set((answers ?? []).map(a => a.profiles.id))]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  let monthlyUsageMap = {}
  if (expertIds.length > 0) {
    const { data: usageCounts } = await supabase
      .from('answers')
      .select('expert_id')
      .in('expert_id', expertIds)
      .gte('created_at', startOfMonth)

    monthlyUsageMap = (usageCounts ?? []).reduce((acc, row) => {
      acc[row.expert_id] = (acc[row.expert_id] || 0) + 1
      return acc
    }, {})
  }

  const answerCount = answers?.length ?? 0

  // Check if user is authenticated (for answer form)
  const { data: { user } } = await supabase.auth.getUser()

  let answerFormProps = null
  if (user) {
    const hasAnswered = (answers ?? []).some(
      a => a.profiles.id === user.id
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('answer_limit')
      .eq('id', user.id)
      .single()

    const { count: budgetCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('expert_id', user.id)
      .gte('created_at', startOfMonth)

    answerFormProps = {
      questionId: question.id,
      budgetUsed: budgetCount ?? 0,
      budgetLimit: profile?.answer_limit ?? 3,
      hasAnswered,
    }
  }

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
