import { createClient } from '@/lib/supabase/server'
import { getCachedTopics } from '@/lib/supabase/cached'
import Link from 'next/link'
import FollowButtonSmall from '@/components/FollowButtonSmall'
import Avatar from '@/components/Avatar'

export const revalidate = 300

export const metadata = {
  title: 'Expert Directory',
  description: 'Browse experts on Credo by topic expertise, answer count, and activity.',
}

export default async function ExpertsPage({ searchParams }) {
  const { sort = 'answers', topic } = await searchParams
  const supabase = await createClient()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  // Auth check for follow buttons
  const { data: { user } } = await supabase.auth.getUser()

  // Parallel fetch: profiles, answers, question_topics with topics, all topics, monthly question count, user follows
  const followsQuery = user
    ? supabase.from('follows').select('following_id').eq('follower_id', user.id)
    : Promise.resolve({ data: [] })

  const [
    { data: profiles },
    { data: answers },
    { data: questionTopics },
    allTopics,
    { count: totalQuestionsThisMonth },
    { data: userFollows },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, headline, organization, follower_count, engagement_score'),
    supabase
      .from('answers')
      .select('expert_id, question_id, created_at, like_count, view_count'),
    supabase
      .from('question_topics')
      .select('question_id, topic_id, topics(id, name, slug)'),
    getCachedTopics(),
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .lte('publish_date', now.toISOString().slice(0, 10))
      .gte('publish_date', startOfMonth)
      .in('status', ['scheduled', 'published']),
    followsQuery,
  ])

  const followedIds = new Set((userFollows ?? []).map(f => f.following_id))

  if (!answers || answers.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-warm-900 mb-2">Expert Directory</h1>
        <div className="text-center py-12">
          <p className="text-warm-600 mb-2">No experts have answered yet.</p>
          <p className="text-warm-500 text-sm mb-4">
            When experts share their perspectives, they&apos;ll appear here.
          </p>
          <Link href="/" className="inline-block px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors">
            See today&apos;s question
          </Link>
        </div>
      </div>
    )
  }

  // Build question -> topics map
  const questionTopicMap = {}
  for (const qt of questionTopics ?? []) {
    if (!questionTopicMap[qt.question_id]) questionTopicMap[qt.question_id] = []
    if (qt.topics) questionTopicMap[qt.question_id].push(qt.topics)
  }

  // Build expert stats: answer_count, total_likes, most_recent, monthly activity, topic expertise
  const statsMap = {}
  for (const a of answers) {
    if (!statsMap[a.expert_id]) {
      statsMap[a.expert_id] = {
        answers: 0,
        likes: 0,
        mostRecent: null,
        monthlyAnswers: 0,
        topicCounts: {},
      }
    }
    const s = statsMap[a.expert_id]
    s.answers += 1
    s.likes += a.like_count ?? 0
    if (!s.mostRecent || a.created_at > s.mostRecent) s.mostRecent = a.created_at
    if (a.created_at >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString()) {
      s.monthlyAnswers += 1
    }
    // Topic expertise derivation
    const topics = questionTopicMap[a.question_id] ?? []
    for (const t of topics) {
      s.topicCounts[t.id] = (s.topicCounts[t.id] || 0) + 1
    }
  }

  // Build topic lookup
  const topicLookup = {}
  for (const t of allTopics ?? []) {
    topicLookup[t.id] = t
  }

  // Derive top expertise tags per expert
  const expertiseMap = {}
  for (const [expertId, s] of Object.entries(statsMap)) {
    expertiseMap[expertId] = Object.entries(s.topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topicId, count]) => ({ ...topicLookup[topicId], count }))
      .filter(t => t.name)
  }

  // Profile lookup
  const profileMap = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = p
  }

  // Build expert list with stats
  let experts = Object.entries(statsMap).map(([id, s]) => ({
    id,
    ...s,
    monthlyAnswerCount: s.monthlyAnswers,
    totalQuestionsThisMonth: totalQuestionsThisMonth ?? 0,
    expertise: expertiseMap[id] ?? [],
    engagementScore: profileMap[id]?.engagement_score ?? 0,
  }))

  // Filter by topic if specified
  if (topic) {
    const filterTopic = (allTopics ?? []).find(t => t.slug === topic)
    if (filterTopic) {
      experts = experts.filter(e => e.topicCounts[filterTopic.id] > 0)
    }
  }

  // Sort
  switch (sort) {
    case 'active':
      experts.sort((a, b) => b.monthlyAnswerCount - a.monthlyAnswerCount || b.answers - a.answers)
      break
    case 'recent':
      experts.sort((a, b) => (b.mostRecent ?? '').localeCompare(a.mostRecent ?? ''))
      break
    case 'likes':
      experts.sort((a, b) => b.likes - a.likes || b.answers - a.answers)
      break
    case 'engagement':
      experts.sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0) || b.answers - a.answers)
      break
    case 'answers':
    default:
      experts.sort((a, b) => b.answers - a.answers || b.likes - a.likes)
      break
  }

  const sortOptions = [
    { key: 'answers', label: 'Answers' },
    { key: 'active', label: 'Active This Month' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'recent', label: 'Recent' },
    { key: 'likes', label: 'Likes' },
  ]

  function buildHref(newSort, newTopic) {
    const params = new URLSearchParams()
    if (newSort && newSort !== 'answers') params.set('sort', newSort)
    if (newTopic) params.set('topic', newTopic)
    const qs = params.toString()
    return `/experts${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900">Expert Directory</h1>
        <p className="text-warm-500 text-sm mt-1">
          {experts.length} {experts.length === 1 ? 'expert' : 'experts'}
          {topic ? ` in ${topic.replace(/-/g, ' ')}` : ''}
        </p>
      </div>

      {/* Sort + filter controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-xs text-warm-400 mr-1">Sort:</span>
          {sortOptions.map(opt => (
            <Link
              key={opt.key}
              href={buildHref(opt.key, topic)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                sort === opt.key
                  ? 'bg-warm-900 text-white'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        {(allTopics ?? []).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-warm-400 mr-1">Topic:</span>
            {topic && (
              <Link
                href={buildHref(sort, null)}
                className="text-xs px-2.5 py-1 rounded-md font-medium bg-warm-200 text-warm-700 hover:bg-warm-300 transition-colors"
              >
                All
              </Link>
            )}
            {(allTopics ?? []).slice(0, 8).map(t => (
              <Link
                key={t.slug}
                href={buildHref(sort, t.slug)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  topic === t.slug
                    ? 'bg-warm-900 text-white'
                    : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Expert cards */}
      {experts.length > 0 ? (
        <div className="space-y-2">
          {experts.map(entry => {
            const profile = profileMap[entry.id]
            if (!profile) return null

            return (
              <Link
                key={entry.id}
                href={`/expert/${profile.handle}`}
                className="flex items-start gap-4 p-4 bg-white rounded-lg border border-warm-200 hover:border-warm-300 transition-colors"
              >
                {/* Avatar */}
                <Avatar src={profile.avatar_url} alt={profile.display_name} size={40} />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-warm-900 truncate">
                    {profile.display_name}
                  </p>
                  <p className="text-xs text-warm-500 truncate">
                    {profile.headline || profile.organization || `@${profile.handle}`}
                  </p>

                  {/* Topic expertise pills */}
                  {entry.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.expertise.map(t => (
                        <span
                          key={t.id}
                          className="text-xs px-2.5 py-1 rounded-md bg-warm-100 text-warm-600 font-medium"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats + Follow */}
                <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-warm-900">{entry.answers}</p>
                    <p className="text-xs text-warm-400">{entry.answers === 1 ? 'answer' : 'answers'}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-warm-900">{entry.monthlyAnswerCount}</p>
                    <p className="text-xs text-warm-400">this month</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-warm-900">{entry.likes}</p>
                    <p className="text-xs text-warm-400">{entry.likes === 1 ? 'like' : 'likes'}</p>
                  </div>
                  {user && user.id !== entry.id && (
                    <FollowButtonSmall
                      targetUserId={entry.id}
                      isFollowing={followedIds.has(entry.id)}
                    />
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-warm-500 text-sm">
            No experts found{topic ? ` for this topic` : ''}.
          </p>
        </div>
      )}
    </div>
  )
}
