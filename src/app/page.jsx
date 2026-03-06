import { createClient } from '@/lib/supabase/server'
import QuestionCard from '@/components/QuestionCard'
import AnswerCard from '@/components/AnswerCard'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  // Check if user is authenticated and has answered
  const { data: { user } } = await supabase.auth.getUser()
  let showNudge = false
  if (user) {
    const { count: userAnswerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('expert_id', user.id)
    showNudge = (userAnswerCount ?? 0) === 0
  }

  // Fetch followed topics for feed personalization
  let followedTopicIds = []
  if (user) {
    const { data: follows } = await supabase
      .from('topic_follows')
      .select('topic_id')
      .eq('user_id', user.id)
    followedTopicIds = (follows ?? []).map(f => f.topic_id)
  }

  // Fetch today's question
  const { data: todayQuestion } = await supabase
    .from('questions')
    .select('*, question_topics(topics(id, name, slug))')
    .lte('publish_date', today)
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

    const unsorted = data ?? []
    todayAnswers = unsorted.sort((a, b) => {
      if (a.featured_at && !b.featured_at) return -1
      if (!a.featured_at && b.featured_at) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }

  // Fetch comments for today's answers
  let commentsMap = {}
  if (todayAnswers.length > 0) {
    const todayAnswerIds = todayAnswers.map(a => a.id)
    const { data: comments } = await supabase
      .from('answer_comments')
      .select('*, profiles!inner(display_name, handle, avatar_url)')
      .in('answer_id', todayAnswerIds)
      .order('created_at', { ascending: true })
    for (const c of comments ?? []) {
      if (!commentsMap[c.answer_id]) commentsMap[c.answer_id] = []
      commentsMap[c.answer_id].push(c)
    }
  }

  // Fetch user's likes for today's answers
  let userLikedAnswerIds = new Set()
  if (user && todayAnswers.length > 0) {
    const answerIds = todayAnswers.map(a => a.id)
    const { data: likes } = await supabase
      .from('answer_likes')
      .select('answer_id')
      .eq('user_id', user.id)
      .in('answer_id', answerIds)
    userLikedAnswerIds = new Set((likes ?? []).map(l => l.answer_id))
  }

  // Fetch recent past questions with answer counts
  let recentQuestions = null
  {
    const { data } = await supabase
      .from('questions')
      .select('*, answers(count), question_topics(topics(id, name, slug))')
      .lt('publish_date', today)
      .in('status', ['scheduled', 'published'])
      .order('publish_date', { ascending: false })
      .limit(10)
    recentQuestions = data
  }

  // Prioritize followed-topic questions for signed-in users
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
    <div className="space-y-8">
      {/* Today's question */}
      {todayQuestion ? (
        <section>
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-2">
            Today&apos;s Question
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
            {todayQuestion.question_topics?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {todayQuestion.question_topics.map((qt) => qt.topics && (
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
              {todayAnswers.length} {todayAnswers.length === 1 ? 'expert has' : 'experts have'} answered
            </p>
          </div>

          {/* First-answer nudge for authenticated users with 0 answers */}
          {showNudge && todayQuestion && (
            <div className="mt-4 p-3 bg-warm-100 rounded-lg text-center">
              <p className="text-warm-700 text-sm">
                This is your first day on Ethos.{' '}
                <Link href={`/q/${todayQuestion.slug}`} className="font-medium underline hover:text-warm-900">
                  Answer today&apos;s question
                </Link>
                {' '}to get started.
              </p>
            </div>
          )}

          {/* Today's answers */}
          {todayAnswers.length > 0 && (
            <div className="mt-6 space-y-4">
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
