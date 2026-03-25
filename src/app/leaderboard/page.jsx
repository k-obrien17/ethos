import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Avatar from '@/components/Avatar'

export const revalidate = 3600

export const metadata = {
  title: 'Leaderboard',
  description: 'Top experts on Credo, ranked by community endorsement.',
}

export default async function LeaderboardPage({ searchParams }) {
  const { sort = 'likes' } = await searchParams
  const supabase = await createClient()

  // Aggregate: total likes, answer count, and share_count per expert
  const { data: answers } = await supabase
    .from('answers')
    .select('expert_id, like_count, view_count')

  if (!answers || answers.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-warm-900 mb-2">Leaderboard</h1>
        <div className="text-center py-12">
          <p className="text-warm-600 mb-2">No answers on the leaderboard yet.</p>
          <p className="text-warm-500 text-sm mb-4">
            Once experts start answering, you&apos;ll see the most active voices here.
          </p>
          <Link href="/experts" className="inline-block px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors">
            Browse experts
          </Link>
        </div>
      </div>
    )
  }

  // Build expert stats: { expertId: { likes, answers, views } }
  const statsMap = {}
  for (const a of answers) {
    if (!statsMap[a.expert_id]) {
      statsMap[a.expert_id] = { likes: 0, answers: 0, views: 0 }
    }
    statsMap[a.expert_id].likes += a.like_count ?? 0
    statsMap[a.expert_id].answers += 1
    statsMap[a.expert_id].views += a.view_count ?? 0
  }

  // Sort based on selected metric
  const ranked = Object.entries(statsMap)
    .map(([id, stats]) => ({ id, ...stats }))

  switch (sort) {
    case 'answers':
      ranked.sort((a, b) => b.answers - a.answers || b.likes - a.likes)
      break
    case 'views':
      ranked.sort((a, b) => b.views - a.views || b.likes - a.likes)
      break
    case 'likes':
    default:
      ranked.sort((a, b) => b.likes - a.likes || b.answers - a.answers)
      break
  }

  const top50 = ranked.slice(0, 50)

  // Fetch profiles for ranked experts
  const rankedIds = top50.map(r => r.id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, handle, avatar_url, headline, organization')
    .in('id', rankedIds)

  const profileMap = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = p
  }

  const sortOptions = [
    { key: 'likes', label: 'Likes' },
    { key: 'answers', label: 'Answers' },
    { key: 'views', label: 'Views' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900">Leaderboard</h1>
        <p className="text-warm-500 text-sm mt-1">
          Ranked by community endorsement
        </p>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-warm-400 mr-1">Sort:</span>
        {sortOptions.map(opt => (
          <Link
            key={opt.key}
            href={opt.key === 'likes' ? '/leaderboard' : `/leaderboard?sort=${opt.key}`}
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

      <div className="space-y-2">
        {top50.map((entry, i) => {
          const profile = profileMap[entry.id]
          if (!profile) return null

          return (
            <Link
              key={entry.id}
              href={`/expert/${profile.handle}`}
              className="flex items-center gap-4 p-4 bg-white rounded-lg border border-warm-200 hover:border-warm-300 transition-colors"
            >
              {/* Rank */}
              <span className={`text-lg font-bold w-8 text-center flex-shrink-0 ${
                i === 0 ? 'text-accent-600' : i === 1 ? 'text-warm-500' : i === 2 ? 'text-accent-500' : 'text-warm-300'
              }`}>
                {i + 1}
              </span>

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
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                <div className="text-center">
                  <p className={`font-semibold ${sort === 'likes' ? 'text-accent-600' : 'text-warm-900'}`}>{entry.likes}</p>
                  <p className="text-xs text-warm-400">{entry.likes === 1 ? 'like' : 'likes'}</p>
                </div>
                <div className="text-center">
                  <p className={`font-semibold ${sort === 'answers' ? 'text-accent-600' : 'text-warm-900'}`}>{entry.answers}</p>
                  <p className="text-xs text-warm-400">{entry.answers === 1 ? 'answer' : 'answers'}</p>
                </div>
                <div className="text-center">
                  <p className={`font-semibold ${sort === 'views' ? 'text-accent-600' : 'text-warm-900'}`}>{entry.views}</p>
                  <p className="text-xs text-warm-400">views</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
