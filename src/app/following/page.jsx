import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AnswerCard from '@/components/AnswerCard'

export const metadata = {
  title: 'Following',
  description: 'Recent answers from experts you follow.',
}

export default async function FollowingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get who this user follows
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (follows ?? []).map(f => f.following_id)

  if (followingIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-warm-900">Following</h1>
        <div className="text-center py-12">
          <p className="text-warm-600 mb-2">You're not following anyone yet.</p>
          <p className="text-warm-500 text-sm mb-4">
            Follow experts to see their answers here.
          </p>
          <Link
            href="/experts"
            className="inline-block px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors"
          >
            Discover experts
          </Link>
        </div>
      </div>
    )
  }

  // Get profile details for followed experts
  const { data: followedProfiles } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url, headline, organization, follower_count')
    .in('id', followingIds)
    .order('display_name', { ascending: true })

  // Get recent answers from followed experts
  const { data: answers } = await supabase
    .from('answers')
    .select(`
      *,
      profiles!answers_expert_id_fkey(id, display_name, handle, avatar_url, answer_limit),
      questions!inner(id, body, slug, category, publish_date)
    `)
    .in('expert_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(30)

  const allAnswers = answers ?? []

  // Parallel: comments + likes
  let commentsMap = {}
  let userLikedAnswerIds = new Set()

  if (allAnswers.length > 0) {
    const answerIds = allAnswers.map(a => a.id)
    const [{ data: comments }, { data: likes }] = await Promise.all([
      supabase
        .from('answer_comments')
        .select('*, profiles(display_name, handle, avatar_url)')
        .in('answer_id', answerIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('answer_likes')
        .select('answer_id')
        .eq('user_id', user.id)
        .in('answer_id', answerIds),
    ])

    for (const c of comments ?? []) {
      if (!commentsMap[c.answer_id]) commentsMap[c.answer_id] = []
      commentsMap[c.answer_id].push(c)
    }
    userLikedAnswerIds = new Set((likes ?? []).map(l => l.answer_id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-900">Following</h1>
        <span className="text-sm text-warm-500">
          {followingIds.length} {followingIds.length === 1 ? 'expert' : 'experts'}
        </span>
      </div>

      {/* Your Experts section */}
      {(followedProfiles ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-warm-700 mb-3">Your Experts</h2>
          <div className="flex flex-wrap gap-3">
            {(followedProfiles ?? []).map(profile => (
              <Link
                key={profile.id}
                href={`/expert/${profile.handle}`}
                className="bg-white rounded-lg border border-warm-200 p-3 flex items-center gap-3 hover:border-warm-300 transition-colors"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center text-warm-600 font-medium text-xs flex-shrink-0">
                    {profile.display_name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm text-warm-900 truncate">{profile.display_name}</p>
                  <p className="text-xs text-warm-500 truncate">
                    {profile.headline || profile.organization || `${profile.follower_count ?? 0} followers`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent from your experts */}
      {allAnswers.length > 0 && (
        <h2 className="text-sm font-semibold text-warm-700">Recent from your experts</h2>
      )}

      {allAnswers.length > 0 ? (
        <div className="space-y-4">
          {allAnswers.map(answer => (
            <div key={answer.id}>
              <Link
                href={`/q/${answer.questions.slug}`}
                className="text-xs text-warm-500 hover:text-warm-700 mb-1 block"
              >
                {answer.questions.category && (
                  <span className="uppercase tracking-wide font-medium mr-2">{answer.questions.category}</span>
                )}
                {answer.questions.body}
              </Link>
              <AnswerCard
                answer={answer}
                expert={answer.profiles}
                featured={!!answer.featured_at}
                isLiked={userLikedAnswerIds.has(answer.id)}
                currentUserId={user.id}
                comments={commentsMap[answer.id] ?? []}
                editWindowExpiresAt={new Date(answer.created_at).getTime() + 15 * 60 * 1000}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-warm-500 text-sm py-8 text-center">
          No recent answers from experts you follow.
        </p>
      )}
    </div>
  )
}
