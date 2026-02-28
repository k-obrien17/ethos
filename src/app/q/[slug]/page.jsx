import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import EditableAnswerCard from '@/components/EditableAnswerCard'
import AnswerForm from '@/components/AnswerForm'
import ShareButton from '@/components/ShareButton'
import BookmarkButton from '@/components/BookmarkButton'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: question } = await supabase
    .from('questions')
    .select('body, category, publish_date')
    .eq('slug', slug)
    .single()

  if (!question) return { title: 'Question not found' }

  const title = question.body
  const description = question.category
    ? `${question.category} question on Ethos`
    : 'A question on Ethos'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{
        url: `/api/og?type=question&title=${encodeURIComponent(question.body)}&subtitle=${encodeURIComponent(question.category ?? '')}&detail=${encodeURIComponent(question.publish_date ?? '')}`,
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function QuestionPage({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch question by slug
  const { data: question } = await supabase
    .from('questions')
    .select('*, question_topics(topics(name, slug))')
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

  // Sort: featured first, then by created_at DESC
  const sortedAnswers = (answers ?? []).sort((a, b) => {
    if (a.featured_at && !b.featured_at) return -1
    if (!a.featured_at && b.featured_at) return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const answerCount = sortedAnswers.length

  // Check if user is authenticated (for answer form)
  const { data: { user } } = await supabase.auth.getUser()

  let isBookmarked = false
  if (user) {
    const { data: bookmark } = await supabase
      .from('bookmarks')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('question_id', question.id)
      .maybeSingle()
    isBookmarked = !!bookmark
  }

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
          {user && (
            <BookmarkButton
              questionId={question.id}
              isBookmarked={isBookmarked}
            />
          )}
          <ShareButton />
        </div>
        <h1 className="text-2xl font-bold text-warm-900">
          {question.body}
        </h1>
        {question.question_topics?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {question.question_topics.map((qt) => qt.topics && (
              <span
                key={qt.topics.slug}
                className="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-600 font-medium"
              >
                {qt.topics.name}
              </span>
            ))}
          </div>
        )}
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
        </section>
      ) : (
        <p className="text-warm-500 text-sm py-8 text-center">
          No answers yet. Be the first expert to weigh in.
        </p>
      )}
    </div>
  )
}
