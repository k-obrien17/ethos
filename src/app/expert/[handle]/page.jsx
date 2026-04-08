import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import FollowButton from '@/components/FollowButton'
import ShareButton from '@/components/ShareButton'
import Avatar from '@/components/Avatar'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const { handle } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, headline, bio')
    .eq('handle', handle)
    .single()

  if (!profile) return { title: 'Expert not found' }

  const title = profile.display_name
  let description = profile.headline || profile.bio?.slice(0, 150) || `${profile.display_name} on Credo`

  // Append top expertise topics if available
  const { data: expertAnswers } = await supabase
    .from('answers')
    .select('question_id')
    .eq('expert_id', profile.id)
  if (expertAnswers?.length) {
    const qIds = [...new Set(expertAnswers.map(a => a.question_id))]
    const { data: qts } = await supabase
      .from('question_topics')
      .select('question_id, topics(name)')
      .in('question_id', qIds)
    if (qts?.length) {
      const tc = {}
      for (const qt of qts) { if (qt.topics) tc[qt.topics.name] = (tc[qt.topics.name] || 0) + 1 }
      const topTopics = Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n)
      if (topTopics.length) description += ` | Expertise: ${topTopics.join(', ')}`
    }
  }

  return {
    title,
    description,
    alternates: { canonical: `/expert/${handle}` },
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [{
        url: `/api/og?type=expert&title=${encodeURIComponent(profile.display_name)}&subtitle=${encodeURIComponent(profile.headline ?? '')}&detail=${encodeURIComponent(profile.bio?.slice(0, 80) ?? '')}`,
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

export default async function ExpertProfilePage({ params }) {
  const { handle } = await params
  const supabase = await createClient()
  const now = new Date()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile by handle
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', handle)
    .single()

  if (!profile) notFound()

  // Parallel: answers, follow status, monthly question count, question_topics for expertise
  const [{ data: answers }, followResult, { count: totalQuestionsThisMonth }, { data: questionTopics }] = await Promise.all([
    supabase
      .from('answers')
      .select(`*, questions!inner(id, body, slug, category, publish_date)`)
      .eq('expert_id', profile.id)
      .order('created_at', { ascending: false }),
    user
      ? supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .lte('publish_date', now.toISOString().slice(0, 10))
      .gte('publish_date', new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
      .in('status', ['scheduled', 'published']),
    supabase
      .from('question_topics')
      .select('question_id, topics(id, name, slug)')
  ])

  const isFollowing = !!followResult?.data
  const allAnswers = answers ?? []
  const totalLikes = allAnswers.reduce((sum, a) => sum + (a.like_count ?? 0), 0)
  const totalViews = allAnswers.reduce((sum, a) => sum + (a.view_count ?? 0), 0)
  const featuredAnswers = allAnswers.filter(a => a.featured_at)

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthlyAnswerCount = allAnswers.filter(a => a.created_at >= startOfMonth).length

  // Derive topic expertise from answered questions
  const questionIds = new Set(allAnswers.map(a => a.question_id))
  const topicCounts = {}
  for (const qt of questionTopics ?? []) {
    if (questionIds.has(qt.question_id) && qt.topics) {
      const tid = qt.topics.id
      if (!topicCounts[tid]) topicCounts[tid] = { ...qt.topics, count: 0 }
      topicCounts[tid].count += 1
    }
  }
  const expertiseTags = Object.values(topicCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const isOwnProfile = user?.id === profile.id

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <section className="flex items-start gap-4">
        <Avatar src={profile.avatar_url} alt={profile.display_name} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-warm-900">
                {profile.display_name}
              </h1>
              {profile.headline && (
                <p className="text-warm-600 mt-0.5">{profile.headline}</p>
              )}
              {profile.organization && (
                <p className="text-warm-500 text-sm">{profile.organization}</p>
              )}
            </div>
            {user && !isOwnProfile && (
              <FollowButton targetUserId={profile.id} isFollowing={isFollowing} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-warm-500">
            <span>@{profile.handle}</span>
            <span>{profile.follower_count ?? 0} followers</span>
            <span>{profile.following_count ?? 0} following</span>
          </div>
          {/* Social links */}
          <div className="flex items-center gap-3 mt-2">
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-warm-500 hover:text-[#0A66C2]">
                LinkedIn
              </a>
            )}
            {profile.twitter_url && (
              <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-sm text-warm-500 hover:text-warm-800">
                X / Twitter
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-warm-500 hover:text-warm-700">
                Website
              </a>
            )}
            <ShareButton url={`/expert/${profile.handle}`} title={`${profile.display_name} on Credo`} />
          </div>
        </div>
      </section>

      {/* Bio */}
      {profile.bio && (
        <section className="text-warm-700 leading-relaxed">
          {profile.bio}
        </section>
      )}

      {/* Expertise */}
      {expertiseTags.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-3">Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {expertiseTags.map(t => (
              <Link
                key={t.id}
                href={`/topics/${t.slug}`}
                className="text-xs px-2.5 py-1 rounded-md bg-warm-100 text-warm-600 font-medium hover:bg-warm-200 transition-colors"
              >
                {t.name} ({t.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{totalLikes}</p>
          <p className="text-xs text-warm-500 mt-1">Likes</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{allAnswers.length}</p>
          <p className="text-xs text-warm-500 mt-1">Answers</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{monthlyAnswerCount}</p>
          <p className="text-xs text-warm-500 mt-1">This Month</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{totalViews}</p>
          <p className="text-xs text-warm-500 mt-1">Views</p>
        </div>
      </section>

      {/* Best answers (featured) */}
      {featuredAnswers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-4">
            Best Answers
          </h2>
          <div className="space-y-4">
            {featuredAnswers.map((answer) => (
              <article key={answer.id} className="bg-accent-50/50 rounded-lg border border-accent-100 p-5">
                <Link href={`/q/${answer.questions.slug}`} className="block mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-3.5 h-3.5 text-accent-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 1l2.39 6.34H19l-5.3 3.85L15.3 18 10 13.82 4.7 18l1.61-6.81L1 7.34h6.61L10 1z" />
                    </svg>
                    <span className="text-xs font-medium text-accent-600">Featured</span>
                    {answer.questions.category && (
                      <span className="text-xs text-warm-500">{answer.questions.category}</span>
                    )}
                  </div>
                  <p className="font-semibold text-warm-900 hover:underline text-sm">
                    {answer.questions.body}
                  </p>
                </Link>
                <div className="prose-answer text-sm">
                  <ReactMarkdown>{answer.body.length > 300 ? answer.body.slice(0, 300) + '...' : answer.body}</ReactMarkdown>
                </div>
                <Link href={`/answers/${answer.id}`} className="text-xs text-warm-500 hover:text-warm-700 mt-2 inline-block">
                  Read full answer →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* All answers */}
      <section>
        <h2 className="text-lg font-semibold text-warm-800 mb-4">
          All Answers ({allAnswers.length})
        </h2>
        {allAnswers.length > 0 ? (
          <div className="divide-y divide-warm-100">
            {allAnswers.map((answer) => (
              <article key={answer.id} className="py-6">
                <Link href={`/q/${answer.questions.slug}`} className="block mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    {answer.questions.category && (
                      <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                        {answer.questions.category}
                      </span>
                    )}
                    <span className="text-xs text-warm-400">
                      {format(new Date(answer.questions.publish_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="font-semibold text-warm-900 hover:underline">
                    {answer.questions.body}
                  </p>
                </Link>

                {answer.featured_at && (
                  <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-accent-600">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 1l2.39 6.34H19l-5.3 3.85L15.3 18 10 13.82 4.7 18l1.61-6.81L1 7.34h6.61L10 1z" />
                    </svg>
                    Featured
                  </div>
                )}

                <div className="prose-answer">
                  <ReactMarkdown>{answer.body}</ReactMarkdown>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-warm-100 text-xs text-warm-400">
                  <span>{answer.word_count} words</span>
                  <div className="flex items-center gap-3">
                    <ShareButton url={`/answers/${answer.id}`} title={`${profile.display_name} on Credo`} />
                    <Link href={`/answers/${answer.id}`} className="hover:text-warm-600">
                      Link
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-warm-500 text-sm text-center py-8">
            No answers yet.
          </p>
        )}
      </section>
    </div>
  )
}
