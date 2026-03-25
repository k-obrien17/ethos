import { createClient } from '@/lib/supabase/server'
import SetFeaturedButton from './SetFeaturedButton'
import ApprovalButton from './ApprovalButton'
import Avatar from '@/components/Avatar'
import { format } from 'date-fns'

export const metadata = { title: 'Experts — Admin' }

export default async function AdminExpertsPage() {
  const supabase = await createClient()

  // Parallel: profiles, answers for stats, current featured expert, pending users
  const [{ data: profiles }, { data: answers }, { data: settingsRow }, { data: pendingUsers }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, headline, engagement_score, status')
      .order('display_name', { ascending: true }),
    supabase
      .from('answers')
      .select('expert_id, like_count'),
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'featured_expert_id')
      .single(),
    supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url, headline, organization, created_at, invited_by, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const featuredExpertId = settingsRow?.value || null

  // Build inviter lookup for pending users
  const inviterIds = [...new Set((pendingUsers ?? []).map(u => u.invited_by).filter(Boolean))]
  let inviterMap = {}
  if (inviterIds.length > 0) {
    const { data: inviters } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', inviterIds)
    for (const inv of inviters ?? []) {
      inviterMap[inv.id] = inv.display_name
    }
  }

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

      {/* Pending Approvals */}
      {(pendingUsers ?? []).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-3">
            Pending Approvals
            <span className="ml-2 text-sm font-normal text-amber-600">
              ({pendingUsers.length})
            </span>
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 py-3 border-b border-amber-100 last:border-b-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar src={user.avatar_url} alt={user.display_name} size={32} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-warm-900 truncate">
                      {user.display_name || 'New User'}
                    </p>
                    <p className="text-xs text-warm-500">
                      @{user.handle}
                      {user.headline && <> &middot; {user.headline}</>}
                      {user.organization && <> &middot; {user.organization}</>}
                    </p>
                    <p className="text-xs text-warm-400 mt-0.5">
                      Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                      {user.invited_by && (
                        <> &middot; Invited by {inviterMap[user.invited_by] || 'unknown'}</>
                      )}
                    </p>
                  </div>
                </div>

                <ApprovalButton userId={user.id} currentStatus="pending" />
              </div>
            ))}
          </div>
        </section>
      )}

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
                    {expert.status === 'suspended' && (
                      <span className="ml-2 text-xs text-red-500 font-normal">suspended</span>
                    )}
                  </p>
                  <p className="text-xs text-warm-400">
                    @{expert.handle} &middot; {expert.answers} answers &middot; {expert.likes} likes
                    {expert.engagement_score > 0 && (
                      <> &middot; engagement: {expert.engagement_score.toFixed(1)}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ApprovalButton userId={expert.id} currentStatus={expert.status || 'approved'} />
                <SetFeaturedButton
                  expertId={expert.id}
                  isFeatured={expert.id === featuredExpertId}
                />
              </div>
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
