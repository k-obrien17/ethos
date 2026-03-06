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

  // Parallel: question + auth
  const [{ data: question }, { data: { user } }] = await Promise.all([
    supabase
      .from('questions')
      .select('*, question_topics(topics(name, slug))')
      .eq('slug', slug)
      .single(),
    supabase.auth.getUser(),
  ])

  if (!question) notFound()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // Parallel: answers + bookmark + user budget/profile (all depend on question.id or user)
  const [{ data: answers }, bookmarkResult, userProfileResult, budgetResult] =
    await Promise.all([
      supabase
        .from('answers')
        .select(`
          *,
          profiles!answers_expert_id_fkey (
            id,
            display_name,
            handle,
            avatar_url,
            answer_limit
          )
        `)
        .eq('question_id', question.id)
        .order('created_at', { ascending: false }),
      user
        ? supabase
            .from('bookmarks')
            .select('question_id')
            .eq('user_id', user.id)
            .eq('question_id', question.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from('profiles')
            .select('answer_limit')
            .eq('id', user.id)
            .single()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from('answers')
            .select('*', { count: 'exact', head: true })
            .eq('expert_id', user.id)
            .gte('created_at', startOfMonth)
        : Promise.resolve({ count: 0 }),
    ])

  const isBookmarked = !!bookmarkResult.data

  // Sort: featured first, then by created_at DESC
  const sortedAnswers = (answers ?? []).sort((a, b) => {
    if (a.featured_at && !b.featured_at) return -1
    if (!a.featured_at && b.featured_at) return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const answerCount = sortedAnswers.length

  // Parallel: monthly usage + comments + likes (depend on answers)
  const expertIds = [...new Set((answers ?? []).map(a => a.profiles.id))]
  const answerIds = sortedAnswers.map(a => a.id)

  const [usageResult, commentsResult, likesResult] = await Promise.all([
    expertIds.length > 0
      ? supabase
          .from('answers')
          .select('expert_id')
          .in('expert_id', expertIds)
          .gte('created_at', startOfMonth)
      : Promise.resolve({ data: [] }),
    answerIds.length > 0
      ? supabase
          .from('answer_comments')
          .select('*, profiles(display_name, handle, avatar_url)')
          .in('answer_id', answerIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    user && answerIds.length > 0
      ? supabase
          .from('answer_likes')
          .select('answer_id')
          .eq('user_id', user.id)
          .in('answer_id', answerIds)
      : Promise.resolve({ data: [] }),
  ])

  const monthlyUsageMap = (usageResult.data ?? []).reduce((acc, row) => {
    acc[row.expert_id] = (acc[row.expert_id] || 0) + 1
    return acc
  }, {})

  let commentsMap = {}
  for (const c of commentsResult.data ?? []) {
    if (!commentsMap[c.answer_id]) commentsMap[c.answer_id] = []
    commentsMap[c.answer_id].push(c)
  }

  const userLikedAnswerIds = new Set((likesResult.data ?? []).map(l => l.answer_id))

  let answerFormProps = null
  if (user) {
    const hasAnswered = (answers ?? []).some(a => a.profiles.id === user.id)
    answerFormProps = {
      questionId: question.id,
      budgetUsed: budgetResult.count ?? 0,
      budgetLimit: userProfileResult.data?.answer_limit ?? 3,
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
              <Link
                key={qt.topics.slug}
                href={`/topics/${qt.topics.slug}`}
                className="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-600 font-medium hover:bg-warm-200 transition-colors"
              >
                {qt.topics.name}
              </Link>
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
              isLiked={userLikedAnswerIds.has(answer.id)}
              comments={commentsMap[answer.id] ?? []}
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
