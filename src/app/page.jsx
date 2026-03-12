import { createClient } from '@/lib/supabase/server'
import { subDays } from 'date-fns'
import QuestionCard from '@/components/QuestionCard'
import AnswerCard from '@/components/AnswerCard'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = subDays(new Date(), 7).toISOString()

  // Parallel: auth + today's question + recent questions + trending candidates
  const [{ data: { user } }, { data: todayQuestion }, { data: recentQuestionsRaw }, { data: trendingRaw }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('questions')
        .select('*, question_topics(topics(id, name, slug))')
        .lte('publish_date', today)
        .in('status', ['scheduled', 'published'])
        .order('publish_date', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('questions')
        .select('*, answers(count), question_topics(topics(id, name, slug))')
        .lt('publish_date', today)
        .in('status', ['scheduled', 'published'])
        .order('publish_date', { ascending: false })
        .limit(10),
      supabase
        .from('answers')
        .select(`
          id, body, view_count, like_count, created_at,
          profiles!answers_expert_id_fkey(display_name, handle, avatar_url),
          questions!inner(body, slug)
        `)
        .gte('created_at', sevenDaysAgo)
        .order('view_count', { ascending: false })
        .limit(20),
    ])

  // Parallel: user-specific queries + today's answers (depends on todayQuestion + user)
  const [userMeta, answersResult] = await Promise.all([
    user
      ? Promise.all([
          supabase
            .from('answers')
            .select('*', { count: 'exact', head: true })
            .eq('expert_id', user.id),
          supabase
            .from('topic_follows')
            .select('topic_id')
            .eq('user_id', user.id),
        ])
      : Promise.resolve([{ count: 0 }, { data: [] }]),
    todayQuestion
      ? supabase
          .from('answers')
          .select(`
            *,
            profiles!answers_expert_id_fkey (
              display_name,
              handle,
              avatar_url,
              answer_limit
            )
          `)
          .eq('question_id', todayQuestion.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const showNudge = user ? (userMeta[0].count ?? 0) === 0 : false
  const followedTopicIds = user
    ? (userMeta[1].data ?? []).map(f => f.topic_id)
    : []

  const unsorted = answersResult.data ?? []
  const todayAnswers = unsorted.sort((a, b) => {
    if (a.featured_at && !b.featured_at) return -1
    if (!a.featured_at && b.featured_at) return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  // Parallel: comments + likes for today's answers
  let commentsMap = {}
  let userLikedAnswerIds = new Set()

  if (todayAnswers.length > 0) {
    const answerIds = todayAnswers.map(a => a.id)
    const [{ data: comments }, likesResult] = await Promise.all([
      supabase
        .from('answer_comments')
        .select('*, profiles(display_name, handle, avatar_url)')
        .in('answer_id', answerIds)
        .order('created_at', { ascending: true }),
      user
        ? supabase
            .from('answer_likes')
            .select('answer_id')
            .eq('user_id', user.id)
            .in('answer_id', answerIds)
        : Promise.resolve({ data: [] }),
    ])

    for (const c of comments ?? []) {
      if (!commentsMap[c.answer_id]) commentsMap[c.answer_id] = []
      commentsMap[c.answer_id].push(c)
    }
    userLikedAnswerIds = new Set((likesResult.data ?? []).map(l => l.answer_id))
  }

  // Compute trending: score = view_count + (like_count * 2), take top 5
  const trendingAnswers = (trendingRaw ?? [])
    .filter(a => (a.view_count ?? 0) > 0 || (a.like_count ?? 0) > 0)
    .map(a => ({ ...a, score: (a.view_count ?? 0) + (a.like_count ?? 0) * 2 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const plainExcerpt = (text, len) =>
    text.replace(/[#*_~`>\[\]()!|-]/g, '').slice(0, len).trim() + (text.length > len ? '...' : '')

  // Prioritize followed-topic questions for signed-in users
  let recentQuestions = recentQuestionsRaw
  if (followedTopicIds.length > 0 && recentQuestions) {
    recentQuestions = [...recentQuestions].sort((a, b) => {
      const aTopics = (a.question_topics ?? []).map(qt => qt.topics?.id).filter(Boolean)
      const bTopics = (b.question_topics ?? []).map(qt => qt.topics?.id).filter(Boolean)
      const aFollowed = aTopics.some(id => followedTopicIds.includes(id))
      const bFollowed = bTopics.some(id => followedTopicIds.includes(id))
      if (aFollowed && !bFollowed) return -1
      if (!aFollowed && bFollowed) return 1
      return 0
    })
  }

  return (
    <div className="space-y-12">
      {/* Landing hero for logged-out visitors */}
      {!user && (
        <section className="py-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-warm-900 leading-tight tracking-tight">
            The only destination for<br />curated, human expertise.
          </h1>
          <p className="text-warm-500 mt-4 max-w-md mx-auto text-base leading-relaxed">
            One curated question per day. Limited answers per month. Every response is a statement of what matters to you.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors"
            >
              Join Ethos
            </Link>
            <Link
              href="/questions"
              className="text-warm-500 text-sm font-medium hover:text-warm-800 transition-colors"
            >
              Browse questions
            </Link>
          </div>
          <p className="text-warm-400 text-xs mt-6">
            Human-only platform &middot; Invite required &middot; No AI-generated content
          </p>
        </section>
      )}

      {/* Today's question */}
      {todayQuestion ? (
        <section>
          <p className="text-xs font-medium text-warm-400 uppercase tracking-widest mb-3">
            Today&apos;s Question
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-warm-900 leading-snug tracking-tight">
            {todayQuestion.body}
          </h1>
          {todayQuestion.question_topics?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {todayQuestion.question_topics.map((qt) => qt.topics && (
                <Link
                  key={qt.topics.slug}
                  href={`/topics/${qt.topics.slug}`}
                  className="text-xs px-2.5 py-1 rounded-md bg-warm-100 text-warm-600 font-medium hover:bg-warm-200 transition-colors"
                >
                  {qt.topics.name}
                </Link>
              ))}
            </div>
          )}
          <p className="text-sm text-warm-400 mt-4">
            {todayAnswers.length} {todayAnswers.length === 1 ? 'perspective' : 'perspectives'}
          </p>

          {/* First-answer nudge for authenticated users with 0 answers */}
          {showNudge && todayQuestion && (
            <div className="mt-6 py-3 border-t border-warm-100 text-center">
              <p className="text-warm-500 text-sm">
                This is your first day on Ethos.{' '}
                <Link href={`/q/${todayQuestion.slug}`} className="text-accent-600 font-medium hover:text-accent-700">
                  Share your perspective
                </Link>
              </p>
            </div>
          )}

          {/* Today's answers */}
          {todayAnswers.length > 0 && (
            <div className="mt-8 divide-y divide-warm-100">
              {todayAnswers.map((answer) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  expert={answer.profiles}
                  monthlyUsage={null}
                  featured={!!answer.featured_at}
                  isLiked={userLikedAnswerIds.has(answer.id)}
                  isAuthenticated={!!user}
                  comments={commentsMap[answer.id] ?? []}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}

          {todayAnswers.length === 0 && (
            <p className="mt-6 text-warm-400 text-sm">
              No perspectives yet. Be the first to share yours.
            </p>
          )}
        </section>
      ) : (
        <section className="text-center py-16">
          <h1 className="text-2xl font-bold text-warm-900 mb-2">Ethos</h1>
          <p className="text-warm-500">
            What you choose to answer reveals what you stand for.
          </p>
          <p className="text-warm-400 text-sm mt-2">
            No question published yet today. Check back soon.
          </p>
        </section>
      )}

      {/* Trending this week */}
      {trendingAnswers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-warm-800">
              Trending This Week
            </h2>
            <Link
              href="/trending"
              className="text-sm text-accent-600 hover:text-accent-700 font-medium"
            >
              See all
            </Link>
          </div>
          <div className="divide-y divide-warm-100">
            {trendingAnswers.map((answer) => (
              <div key={answer.id} className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  {answer.profiles?.avatar_url ? (
                    <img src={answer.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center text-warm-500 text-xs font-medium">
                      {answer.profiles?.display_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <Link href={`/expert/${answer.profiles?.handle}`} className="text-sm font-medium text-warm-700 hover:text-warm-900">
                    {answer.profiles?.display_name}
                  </Link>
                </div>
                <Link href={`/q/${answer.questions?.slug}`} className="block text-sm font-semibold text-warm-900 hover:text-accent-600 transition-colors mb-1">
                  {answer.questions?.body}
                </Link>
                <p className="text-sm text-warm-500 leading-relaxed mb-2">
                  {plainExcerpt(answer.body, 200)}
                </p>
                <div className="flex items-center gap-3 text-xs text-warm-400">
                  {(answer.view_count ?? 0) > 0 && <span>{answer.view_count} views</span>}
                  {(answer.like_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      {answer.like_count}
                    </span>
                  )}
                  <Link href={`/answers/${answer.id}`} className="text-accent-600 hover:text-accent-700 font-medium ml-auto">
                    Read more
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent questions feed */}
      {recentQuestions && recentQuestions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-warm-800">
              Recent Questions
            </h2>
            <Link
              href="/questions"
              className="text-sm text-accent-600 hover:text-accent-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-warm-100">
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
