import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EditProfileForm from '@/components/EditProfileForm'
import DeleteAccountSection from '@/components/DeleteAccountSection'

export const metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Monthly stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStr = now.toISOString().slice(0, 10)

  const { count: monthlyAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)
    .gte('created_at', startOfMonth)

  const { count: totalAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)

  const { count: questionsThisMonth } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .lte('publish_date', todayStr)
    .gte('publish_date', startOfMonth.slice(0, 10))
    .in('status', ['scheduled', 'published'])

  // Fetch today's question (for nudge when totalAnswers === 0)
  const { data: todayQuestion } = await supabase
    .from('questions')
    .select('slug, body')
    .lte('publish_date', todayStr)
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })
    .limit(1)
    .single()

  const budgetRemaining = (profile?.answer_limit ?? 3) - (monthlyAnswers ?? 0)

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <section className="flex items-start gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-warm-200 flex items-center justify-center text-warm-600 font-bold text-xl flex-shrink-0">
            {profile?.display_name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-warm-900">
            {profile?.display_name}
          </h1>
          {profile?.headline && (
            <p className="text-warm-600 mt-0.5">{profile.headline}</p>
          )}
          {profile?.organization && (
            <p className="text-warm-500 text-sm">{profile.organization}</p>
          )}
          <p className="text-warm-400 text-sm mt-1">@{profile?.handle}</p>
          <Link
            href={`/expert/${profile?.handle}`}
            className="text-sm text-warm-500 hover:text-warm-700 mt-1 inline-block"
          >
            View public profile →
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">
            {monthlyAnswers ?? 0} / {profile?.answer_limit ?? 3}
          </p>
          <p className="text-xs text-warm-500 mt-1">Budget Used</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">
            {questionsThisMonth > 0
              ? `${Math.round(((monthlyAnswers ?? 0) / questionsThisMonth) * 100)}%`
              : '—'}
          </p>
          <p className="text-xs text-warm-500 mt-1">Selectivity</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{totalAnswers ?? 0}</p>
          <p className="text-xs text-warm-500 mt-1">Total Answers</p>
        </div>
      </section>

      {budgetRemaining > 0 ? (
        <p className="text-sm text-warm-500 -mt-4">
          {budgetRemaining} answer{budgetRemaining !== 1 ? 's' : ''} remaining this month
        </p>
      ) : (
        <p className="text-sm text-warm-400 -mt-4">
          Monthly budget used — answers reset next month
        </p>
      )}

      {/* First-answer nudge */}
      {totalAnswers === 0 && todayQuestion && (
        <section className="bg-warm-100 rounded-lg p-6 text-center">
          <p className="text-warm-800 font-medium">
            Ready to share your first answer?
          </p>
          <p className="text-warm-600 text-sm mt-1">
            Today&apos;s question is waiting. Your answer budget resets monthly — use it or lose it.
          </p>
          <Link
            href={`/q/${todayQuestion.slug}`}
            className="inline-block mt-3 px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
          >
            Answer today&apos;s question
          </Link>
        </section>
      )}

      {/* Notification Preferences */}
      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-warm-800">
              Notification Preferences
            </h2>
            <p className="text-sm text-warm-500 mt-1">
              Manage which emails you receive from Ethos.
            </p>
          </div>
          <Link
            href="/dashboard/notifications"
            className="px-4 py-2 bg-warm-100 text-warm-700 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors"
          >
            Manage
          </Link>
        </div>
      </section>

      {/* Edit Profile */}
      <section>
        <h2 className="text-lg font-semibold text-warm-800 mb-4">Edit Profile</h2>
        <EditProfileForm profile={profile} />
      </section>

      {/* Danger zone */}
      <section className="pt-4 border-t border-warm-200">
        <DeleteAccountSection />
      </section>
    </div>
  )
}
