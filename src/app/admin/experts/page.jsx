import { createClient } from '@/lib/supabase/server'
import SetFeaturedButton from './SetFeaturedButton'
import Avatar from '@/components/Avatar'

export const metadata = { title: 'Experts — Admin' }

export default async function AdminExpertsPage() {
  const supabase = await createClient()

  // Parallel: profiles, answers for stats, current featured expert
  const [{ data: profiles }, { data: answers }, { data: settingsRow }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, headline')
      .order('display_name', { ascending: true }),
    supabase
      .from('answers')
      .select('expert_id, like_count'),
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'featured_expert_id')
      .single(),
  ])

  const featuredExpertId = settingsRow?.value || null

  // Aggregate answer stats
  const statsMap = {}
  for (const a of answers ?? []) {
    if (!statsMap[a.expert_id]) statsMap[a.expert_id] = { answers: 0, likes: 0 }
    statsMap[a.expert_id].answers += 1
    statsMap[a.expert_id].likes += a.like_count ?? 0
  }

  // Only show profiles that have at least one answer
  const experts = (profiles ?? [])
    .filter(p => statsMap[p.id])
    .map(p => ({
      ...p,
      answers: statsMap[p.id]?.answers ?? 0,
      likes: statsMap[p.id]?.likes ?? 0,
    }))
    .sort((a, b) => b.answers - a.answers)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-900">
          Experts
          <span className="text-warm-400 font-normal text-lg ml-2">
            ({experts.length})
          </span>
        </h1>
      </div>

      {featuredExpertId && (
        <div className="bg-accent-50 border border-accent-100 rounded-lg px-4 py-3 text-sm text-accent-700">
          Currently featuring: <strong>{experts.find(e => e.id === featuredExpertId)?.display_name || 'Unknown'}</strong>
        </div>
      )}

      {experts.length > 0 ? (
        <div className="bg-white border border-warm-200 rounded-lg px-4">
          {experts.map((expert) => (
            <div
              key={expert.id}
              className="flex items-center justify-between gap-4 py-3 border-b border-warm-100 last:border-b-0"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar src={expert.avatar_url} alt={expert.display_name} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">
                    {expert.display_name}
                  </p>
                  <p className="text-xs text-warm-400">
                    @{expert.handle} &middot; {expert.answers} answers &middot; {expert.likes} likes
                  </p>
                </div>
              </div>

              <SetFeaturedButton
                expertId={expert.id}
                isFeatured={expert.id === featuredExpertId}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-warm-500 text-sm">
          No experts with answers yet.
        </p>
      )}
    </div>
  )
}
