import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import AnswerCard from '@/components/AnswerCard'
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
    ? `${question.category} question on Credo`
    : 'A question on Credo'

  return {
    title,
    description,
    alternates: { canonical: `/q/${slug}` },
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
  const [{ data: answers }, bookmarkResult, userProfileResult, budgetResult, draftResult] =
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
            answer_limit,
            organization
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
      user
        ? supabase
            .from('answer_drafts')
            .select('body')
            .eq('user_id', user.id)
            .eq('question_id', question.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
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
  const expertIds = [...new Set((answers ?? []).map(a => a.profiles?.id).filter(Boolean))]
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

  // Answer cap and deadline checks
  const isDeadlinePassed = question.answer_deadline && new Date(question.answer_deadline) < new Date()
  const isCapReached = question.answer_cap && answerCount >= question.answer_cap
  const isQuestionClosed = isDeadlinePassed || isCapReached

  let answerFormProps = null
  if (user && !isQuestionClosed) {
    const hasAnswered = (answers ?? []).some(a => a.profiles?.id === user.id)
    answerFormProps = {
      questionId: question.id,
      budgetUsed: budgetResult.count ?? 0,
      budgetLimit: userProfileResult.data?.answer_limit ?? 3,
      hasAnswered,
      serverDraft: draftResult.data?.body || null,
    }
  }

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ethos-daily.vercel.app'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: question.body,
      text: question.body,
      dateCreated: question.publish_date,
      answerCount: sortedAnswers.length,
      ...(sortedAnswers.length > 0 && {
        acceptedAnswer: {
          '@type': 'Answer',
          text: sortedAnswers[0].body?.slice(0, 500),
          dateCreated: sortedAnswers[0].created_at,
          author: {
            '@type': 'Person',
            name: sortedAnswers[0].profiles?.display_name,
            url: `${BASE_URL}/expert/${sortedAnswers[0].profiles?.handle}`,
          },
        },
        suggestedAnswer: sortedAnswers.slice(1).map(a => ({
          '@type': 'Answer',
          text: a.body?.slice(0, 500),
          dateCreated: a.created_at,
          author: {
            '@type': 'Person',
            name: a.profiles?.display_name,
            url: `${BASE_URL}/expert/${a.profiles?.handle}`,
          },
        })),
      }),
    },
  }

  return (
    <div className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Question */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          {question.category && (
            <span className="text-xs font-medium text-warm-400 uppercase tracking-widest">
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
          <ShareButton url={`/q/${slug}`} title={question.body} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-warm-900 leading-snug tracking-tight">
          {question.body}
        </h1>
        {question.question_topics?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {question.question_topics.map((qt) => qt.topics && (
              <Link
                key={qt.topics.slug}
                href={`/topics/${qt.topics.slug}`}
                className="text-xs px-2.5 py-1 rounded-md bg-warm-100 text-warm-500 font-medium hover:bg-warm-200 hover:text-warm-600 transition-colors"
              >
                {qt.topics.name}
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-warm-400">
          <span>{answerCount} {answerCount === 1 ? 'perspective' : 'perspectives'}</span>
          {question.answer_cap && (
            <span className={isCapReached ? 'text-red-500' : ''}>
              {isCapReached ? 'Answer limit reached' : `${answerCount}/${question.answer_cap} answers`}
            </span>
          )}
          {question.answer_deadline && !isDeadlinePassed && (
            <span>
              Closes {format(new Date(question.answer_deadline), 'MMM d, yyyy')}
            </span>
          )}
          {isDeadlinePassed && (
            <span className="text-red-500">Answer window closed</span>
          )}
        </div>
      </section>

      {/* Answer form (authenticated users only) */}
      {isQuestionClosed ? (
        <div className="py-4 px-4 text-center bg-warm-50 rounded-lg border border-warm-200">
          <p className="text-warm-600 text-sm font-medium">
            {isCapReached ? 'This question has reached its answer limit.' : 'The answer window for this question has closed.'}
          </p>
          <p className="text-warm-400 text-xs mt-1">Browse other questions to share your perspective.</p>
        </div>
      ) : answerFormProps ? (
        <AnswerForm {...answerFormProps} />
      ) : (
        <div className="py-4 text-center">
          <p className="text-warm-500 text-sm">
            <Link href="/login" className="text-accent-600 font-medium hover:text-accent-700">
              Sign in
            </Link>
            {' '}to share your perspective.
          </p>
        </div>
      )}

      {/* Answers */}
      {answerCount > 0 ? (
        <section className="divide-y divide-warm-100">
          {sortedAnswers.map((answer) => (
            <AnswerCard
              key={answer.id}
              answer={answer}
              expert={answer.profiles}
              monthlyUsage={monthlyUsageMap[answer.profiles?.id] ?? null}
              currentUserId={user?.id}
              featured={!!answer.featured_at}
              isLiked={userLikedAnswerIds.has(answer.id)}
              comments={commentsMap[answer.id] ?? []}
              editWindowExpiresAt={new Date(answer.created_at).getTime() + 15 * 60 * 1000}
            />
          ))}
        </section>
      ) : (
        <p className="text-warm-400 text-sm py-8 text-center">
          No perspectives yet. Be the first to share yours.
        </p>
      )}
    </div>
  )
}
