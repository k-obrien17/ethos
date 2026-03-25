import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import QuestionCard from '@/components/QuestionCard'
import FollowTopicButton from '@/components/FollowTopicButton'
import Avatar from '@/components/Avatar'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: topic } = await supabase
    .from('topics')
    .select('name, description')
    .eq('slug', slug)
    .single()

  if (!topic) return { title: 'Topic not found' }

  return {
    title: topic.name,
    description: topic.description || `Questions about ${topic.name} on Ethos`,
    alternates: { canonical: `/topics/${slug}` },
  }
}

export default async function TopicDetailPage({ params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch topic by slug
  const { data: topic } = await supabase
    .from('topics')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!topic) notFound()

  // Fetch question IDs for this topic
  const { data: qtRows } = await supabase
    .from('question_topics')
    .select('question_id')
    .eq('topic_id', topic.id)

  const questionIds = (qtRows ?? []).map(r => r.question_id)

  // Fetch questions with answer counts and topic data
  let questions = []
  if (questionIds.length > 0) {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('questions')
      .select('*, answers(count), question_topics(topics(name, slug))')
      .in('id', questionIds)
      .in('status', ['scheduled', 'published'])
      .lte('publish_date', today)
      .order('publish_date', { ascending: false })

    questions = data ?? []
  }

  // Fetch top 5 answers in this topic by engagement (likes + views)
  let topAnswers = []
  if (questionIds.length > 0) {
    const { data: answers } = await supabase
      .from('answers')
      .select('id, body, like_count, view_count, comment_count, created_at, expert_id, question_id, profiles:expert_id(display_name, handle, avatar_url, headline), questions:question_id(body, slug)')
      .in('question_id', questionIds)
      .is('hidden_at', null)
      .order('like_count', { ascending: false })
      .limit(5)

    topAnswers = (answers ?? []).filter(a => (a.like_count ?? 0) + (a.view_count ?? 0) > 0)
  }

  // Check if current user follows this topic
  let isFollowed = false
  if (user) {
    const { data: follow } = await supabase
      .from('topic_follows')
      .select('topic_id')
      .eq('user_id', user.id)
      .eq('topic_id', topic.id)
      .maybeSingle()
    isFollowed = !!follow
  }

  // Fetch follower count
  const { count: followerCount } = await supabase
    .from('topic_follows')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', topic.id)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-warm-900">{topic.name}</h1>
            {topic.description && (
              <p className="text-warm-500 mt-1">{topic.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-warm-400">
              <span>
                {questions.length} {questions.length === 1 ? 'question' : 'questions'}
              </span>
              <span>·</span>
              <span>
                {followerCount ?? 0} {followerCount === 1 ? 'follower' : 'followers'}
              </span>
            </div>
          </div>
          {user && (
            <FollowTopicButton topicId={topic.id} isFollowed={isFollowed} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Questions */}
        <div>
          <h2 className="text-sm font-semibold text-warm-900 uppercase tracking-widest mb-3">
            Questions
          </h2>
          {questions.length > 0 ? (
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
              No questions tagged with this topic yet.
            </p>
          )}
        </div>

        {/* Right column: Top Answers */}
        <div>
          <h2 className="text-sm font-semibold text-warm-900 uppercase tracking-widest mb-3">
            Top Answers
          </h2>
          {topAnswers.length > 0 ? (
            <div className="space-y-3">
              {topAnswers.map(answer => (
                <Link
                  key={answer.id}
                  href={`/q/${answer.questions.slug}`}
                  className="block p-4 bg-white rounded-lg border border-warm-200 hover:border-warm-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar src={answer.profiles?.avatar_url} alt={answer.profiles?.display_name || 'Expert'} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-warm-900">{answer.profiles?.display_name}</span>
                        <span className="text-xs text-warm-400 truncate">{answer.profiles?.headline}</span>
                      </div>
                      <p className="text-xs text-warm-500 mt-0.5 italic line-clamp-1">
                        {answer.questions.body}
                      </p>
                      <p className="text-sm text-warm-700 mt-1.5 line-clamp-3">
                        {answer.body.slice(0, 200)}{answer.body.length > 200 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-warm-400">
                        {answer.like_count > 0 && <span>{answer.like_count} {answer.like_count === 1 ? 'like' : 'likes'}</span>}
                        {answer.view_count > 0 && <span>{answer.view_count} views</span>}
                        {answer.comment_count > 0 && <span>{answer.comment_count} {answer.comment_count === 1 ? 'comment' : 'comments'}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-warm-500 text-sm text-center py-8">
              No top answers yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
