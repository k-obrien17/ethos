import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth } from 'date-fns'

export const metadata = { title: 'Analytics' }

function StatCard({ label, value, sublabel, color = 'warm' }) {
  const colors = {
    warm: 'bg-warm-50 border-warm-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    amber: 'bg-amber-50 border-amber-200',
    red: 'bg-red-50 border-red-200',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 ${colors[color]}`}>
      <p className="text-2xl font-bold text-warm-900">{value}</p>
      <p className="text-sm font-medium text-warm-700">{label}</p>
      {sublabel && <p className="text-xs text-warm-500 mt-0.5">{sublabel}</p>}
    </div>
  )
}

function formatNumber(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const fourteenDaysAgo = subDays(now, 14).toISOString()
  const thirtyDaysAgo = subDays(now, 30).toISOString()
  const sevenDaysAgo = subDays(now, 7).toISOString()
  const ninetyDaysAgo = subDays(now, 90).toISOString()

  // Fetch all data in parallel
  const [
    { count: totalUsers },
    { count: totalAnswers },
    { count: totalQuestions },
    { count: totalFollows },
    { count: totalLikes },
    { count: totalComments },
    { data: inviteStats },
    { data: recentAnswers },
    { data: recentSignups },
    { data: allProfiles },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('answers').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('follows').select('*', { count: 'exact', head: true }),
    supabase.from('answer_likes').select('*', { count: 'exact', head: true }),
    supabase.from('answer_comments').select('*', { count: 'exact', head: true }),
    supabase.from('invites').select('id, claimed_at'),
    supabase
      .from('answers')
      .select('expert_id, question_id, view_count, like_count, created_at')
      .gte('created_at', ninetyDaysAgo),
    supabase
      .from('profiles')
      .select('display_name, handle, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('id, display_name, handle, follower_count'),
  ])

  const answers = recentAnswers ?? []
  const profiles = allProfiles ?? []
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

  // --- DAU calculation (last 14 days) ---
  const dauByDay = {}
  for (let i = 0; i < 14; i++) {
    const dayStr = subDays(now, i).toISOString().slice(0, 10)
    dauByDay[dayStr] = new Set()
  }
  for (const a of answers) {
    const dayStr = a.created_at.slice(0, 10)
    if (dauByDay[dayStr]) {
      dauByDay[dayStr].add(a.expert_id)
    }
  }
  const dauData = []
  for (let i = 0; i < 7; i++) {
    const dayStr = subDays(now, i).toISOString().slice(0, 10)
    dauData.push({ date: dayStr, count: dauByDay[dayStr]?.size ?? 0 })
  }
  const todayDAU = dauData[0]?.count ?? 0

  // --- Answer Submission Rates ---
  const todayAnswers = answers.filter(a => a.created_at.slice(0, 10) === todayStr).length
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString()
  const thisMonthStart = startOfMonth(now).toISOString()
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()

  const thisWeekAnswers = answers.filter(a => a.created_at >= thisWeekStart).length
  const lastWeekAnswers = answers.filter(a => a.created_at >= lastWeekStart && a.created_at < thisWeekStart).length
  const thisMonthAnswers = answers.filter(a => a.created_at >= thisMonthStart).length
  const lastMonthAnswers = answers.filter(a => a.created_at >= lastMonthStart && a.created_at < thisMonthStart).length

  const weekChange = lastWeekAnswers > 0
    ? Math.round(((thisWeekAnswers - lastWeekAnswers) / lastWeekAnswers) * 100)
    : null
  const monthChange = lastMonthAnswers > 0
    ? Math.round(((thisMonthAnswers - lastMonthAnswers) / lastMonthAnswers) * 100)
    : null

  // --- Expert Engagement (top 10 by answer count) ---
  const expertStats = {}
  for (const a of answers) {
    if (!expertStats[a.expert_id]) {
      expertStats[a.expert_id] = { answerCount: 0, totalLikes: 0, totalViews: 0 }
    }
    expertStats[a.expert_id].answerCount++
    expertStats[a.expert_id].totalLikes += a.like_count ?? 0
    expertStats[a.expert_id].totalViews += a.view_count ?? 0
  }
  const topExperts = Object.entries(expertStats)
    .sort(([, a], [, b]) => b.answerCount - a.answerCount || b.totalLikes - a.totalLikes)
    .slice(0, 10)
    .map(([expertId, stats]) => ({
      ...stats,
      profile: profileMap[expertId] || { display_name: 'Unknown', handle: '?', follower_count: 0 },
    }))

  // --- Most Popular Questions (top 10 by views + answer count) ---
  const questionStats = {}
  for (const a of answers) {
    if (!questionStats[a.question_id]) {
      questionStats[a.question_id] = { answerCount: 0, totalViews: 0 }
    }
    questionStats[a.question_id].answerCount++
    questionStats[a.question_id].totalViews += a.view_count ?? 0
  }
  const topQuestionIds = Object.entries(questionStats)
    .sort(([, a], [, b]) => (b.totalViews + b.answerCount) - (a.totalViews + a.answerCount))
    .slice(0, 10)
    .map(([id]) => id)

  let topQuestions = []
  if (topQuestionIds.length > 0) {
    const { data: questionData } = await supabase
      .from('questions')
      .select('id, body')
      .in('id', topQuestionIds)

    const questionMap = Object.fromEntries((questionData ?? []).map(q => [q.id, q]))
    topQuestions = topQuestionIds.map(id => ({
      body: questionMap[id]?.body ?? 'Unknown question',
      ...questionStats[id],
    }))
  }

  // --- Invite stats ---
  const invitesClaimed = (inviteStats ?? []).filter(i => i.claimed_at).length
  const invitesTotal = (inviteStats ?? []).length
  const inviteConversion = invitesTotal > 0 ? Math.round((invitesClaimed / invitesTotal) * 100) : 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-warm-900">Analytics</h1>

      {/* Overview */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Users" value={totalUsers ?? 0} color="blue" />
        <StatCard label="Answers" value={totalAnswers ?? 0} sublabel={`${thisWeekAnswers} this week`} color="green" />
        <StatCard label="Questions" value={totalQuestions ?? 0} color="warm" />
        <StatCard label="Follows" value={totalFollows ?? 0} color="amber" />
      </section>

      {/* Engagement */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">Engagement</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Likes" value={totalLikes ?? 0} color="warm" />
          <StatCard label="Total Comments" value={totalComments ?? 0} color="warm" />
          <StatCard
            label="Invite Conversion"
            value={`${inviteConversion}%`}
            sublabel={`${invitesClaimed} of ${invitesTotal} claimed`}
            color="amber"
          />
          <StatCard
            label="Daily Active Users"
            value={todayDAU}
            sublabel="active today"
            color="blue"
          />
        </div>
      </section>

      {/* Daily Active Users */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Daily Active Users (Last 7 Days)
        </h2>
        <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
          {dauData.map(({ date, count }) => (
            <div key={date} className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-warm-700">{format(new Date(date + 'T12:00:00'), 'EEE, MMM d')}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 bg-warm-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (count / Math.max(1, ...dauData.map(d => d.count))) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-warm-900 w-8 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Answer Submission Rates */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Answer Submission Rates
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            label="Today's Answers"
            value={todayAnswers}
            color="green"
          />
          <StatCard
            label="This Week"
            value={thisWeekAnswers}
            sublabel={weekChange !== null ? `${weekChange >= 0 ? '+' : ''}${weekChange}% vs last week` : 'no prior week data'}
            color="green"
          />
          <StatCard
            label="This Month"
            value={thisMonthAnswers}
            sublabel={monthChange !== null ? `${monthChange >= 0 ? '+' : ''}${monthChange}% vs last month` : 'no prior month data'}
            color="green"
          />
        </div>
      </section>

      {/* Most Popular Questions */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Most Popular Questions
        </h2>
        <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
          {topQuestions.length === 0 && (
            <p className="px-4 py-3 text-sm text-warm-400">No question data yet.</p>
          )}
          {topQuestions.map((q, i) => (
            <div key={i} className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-sm font-bold text-warm-400 w-6 shrink-0">{i + 1}</span>
                <p className="text-sm text-warm-900 truncate">
                  {q.body.length > 80 ? q.body.slice(0, 80) + '...' : q.body}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-xs text-warm-500">
                <span>{q.answerCount} answers</span>
                <span>{formatNumber(q.totalViews)} views</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Most Active Experts */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Most Active Experts
        </h2>
        <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
          {topExperts.length === 0 && (
            <p className="px-4 py-3 text-sm text-warm-400">No expert data yet.</p>
          )}
          {topExperts.map((expert, i) => (
            <div key={expert.profile.handle} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-warm-400 w-6">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-warm-900">{expert.profile.display_name}</p>
                  <p className="text-xs text-warm-500">@{expert.profile.handle}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-warm-500">
                <span>{expert.answerCount} answers</span>
                <span>{expert.totalLikes} likes</span>
                <span>{formatNumber(expert.totalViews)} views</span>
                <span>{expert.profile.follower_count ?? 0} followers</span>
              </div>
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
