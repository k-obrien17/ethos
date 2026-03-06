import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format, subDays } from 'date-fns'

export const metadata = { title: 'Analytics' }

function StatCard({ label, value, sublabel, color = 'warm' }) {
  const colors = {
    warm: 'bg-warm-50 border-warm-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 ${colors[color]}`}>
      <p className="text-2xl font-bold text-warm-900">{value}</p>
      <p className="text-sm font-medium text-warm-700">{label}</p>
      {sublabel && <p className="text-xs text-warm-500 mt-0.5">{sublabel}</p>}
    </div>
  )
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const thirtyDaysAgo = subDays(now, 30).toISOString()
  const sevenDaysAgo = subDays(now, 7).toISOString()

  const [
    { count: totalUsers },
    { count: totalAnswers },
    { count: totalQuestions },
    { count: weeklyAnswers },
    { count: monthlyAnswers },
    { count: totalLikes },
    { count: totalComments },
    { count: totalFollows },
    { data: inviteStats },
    { data: topExperts },
    { data: recentSignups },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('answers').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('answers').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('answers').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('answer_likes').select('*', { count: 'exact', head: true }),
    supabase.from('answer_comments').select('*', { count: 'exact', head: true }),
    supabase.from('follows').select('*', { count: 'exact', head: true }),
    supabase.from('invites').select('id, claimed_at'),
    supabase
      .from('profiles')
      .select('display_name, handle, follower_count')
      .order('follower_count', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('display_name, handle, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const invitesClaimed = (inviteStats ?? []).filter(i => i.claimed_at).length
  const invitesTotal = (inviteStats ?? []).length
  const inviteConversion = invitesTotal > 0 ? Math.round((invitesClaimed / invitesTotal) * 100) : 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-warm-900">Analytics</h1>

      {/* Overview */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Users" value={totalUsers ?? 0} color="blue" />
        <StatCard label="Answers" value={totalAnswers ?? 0} sublabel={`${weeklyAnswers ?? 0} this week`} color="green" />
        <StatCard label="Questions" value={totalQuestions ?? 0} color="warm" />
        <StatCard label="Follows" value={totalFollows ?? 0} color="amber" />
      </section>

      {/* Engagement */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Engagement</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Likes" value={totalLikes ?? 0} color="warm" />
          <StatCard label="Total Comments" value={totalComments ?? 0} color="warm" />
          <StatCard label="Monthly Answers" value={monthlyAnswers ?? 0} sublabel="last 30 days" color="green" />
          <StatCard
            label="Invite Conversion"
            value={`${inviteConversion}%`}
            sublabel={`${invitesClaimed} of ${invitesTotal} claimed`}
            color="amber"
          />
        </div>
      </section>

      {/* Top experts by followers */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Top Experts by Followers
        </h2>
        <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
          {(topExperts ?? []).map((expert, i) => (
            <div key={expert.handle} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-warm-400 w-6">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-warm-900">{expert.display_name}</p>
                  <p className="text-xs text-warm-500">@{expert.handle}</p>
                </div>
              </div>
              <span className="text-sm text-warm-600">{expert.follower_count ?? 0} followers</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent signups */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Recent Signups
        </h2>
        <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
          {(recentSignups ?? []).map(user => (
            <div key={user.handle} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-warm-900">{user.display_name}</p>
                <p className="text-xs text-warm-500">@{user.handle}</p>
              </div>
              <span className="text-xs text-warm-400">
                {format(new Date(user.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
