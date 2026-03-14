import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import QuestionCard from '@/components/QuestionCard'
import FollowTopicButton from '@/components/FollowTopicButton'

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
  )
}
