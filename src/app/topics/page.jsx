import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import FollowTopicButton from '@/components/FollowTopicButton'

export const revalidate = 300

export const metadata = {
  title: 'Topics',
  description: 'Discover questions by subject on Ethos.',
}

export default async function TopicsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all topics with question counts and follower counts
  const { data: topics } = await supabase
    .from('topics')
    .select('*, question_topics(count), topic_follows(count)')
    .order('name')

  // If user is authenticated, fetch their followed topic IDs
  let followedTopicIds = []
  if (user) {
    const { data: follows } = await supabase
      .from('topic_follows')
      .select('topic_id')
      .eq('user_id', user.id)
    followedTopicIds = (follows ?? []).map(f => f.topic_id)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900">Topics</h1>
        <p className="text-warm-500 text-sm mt-1">
          Discover questions by subject
        </p>
      </div>

      {topics && topics.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topics.map((topic) => {
            const questionCount = topic.question_topics?.[0]?.count ?? 0
            const followerCount = topic.topic_follows?.[0]?.count ?? 0
            const isFollowed = followedTopicIds.includes(topic.id)

            return (
              <div
                key={topic.id}
                className="bg-white rounded-lg border border-warm-200 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/topics/${topic.slug}`}
                      className="text-lg font-semibold text-warm-900 hover:text-warm-700"
                    >
                      {topic.name}
                    </Link>
                    {topic.description && (
                      <p className="text-sm text-warm-500 mt-1 line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-warm-400">
                      <span>
                        {questionCount} {questionCount === 1 ? 'question' : 'questions'}
                      </span>
                      <span>
                        {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                      </span>
                    </div>
                  </div>
                  {user && (
                    <FollowTopicButton
                      topicId={topic.id}
                      isFollowed={isFollowed}
                      size="small"
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-warm-600 mb-2">No topics yet.</p>
          <p className="text-warm-500 text-sm mb-4">
            Topics will appear as questions are organized. Browse questions in the meantime.
          </p>
          <Link href="/questions" className="inline-block px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors">
            Browse questions
          </Link>
        </div>
      )}
    </div>
  )
}
