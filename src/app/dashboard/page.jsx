import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EditProfileForm from '@/components/EditProfileForm'
import DeleteAccountSection from '@/components/DeleteAccountSection'
import VerifyEmailBanner from '@/components/VerifyEmailBanner'
import BookmarkButton from '@/components/BookmarkButton'
import { format } from 'date-fns'
import Avatar from '@/components/Avatar'

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

  // Fetch user's bookmarked questions
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('question_id, created_at, questions!inner(id, body, slug, category, publish_date, status)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const savedQuestions = (bookmarks ?? []).map(b => ({
    ...b.questions,
    bookmarkedAt: b.created_at,
  }))

  // Fetch user's answers with engagement metrics
  const { data: myAnswers } = await supabase
    .from('answers')
    .select('id, view_count, like_count, comment_count, featured_at, body, created_at, questions!inner(body, slug)')
    .eq('expert_id', user.id)
    .order('created_at', { ascending: false })

  const totalViews = (myAnswers ?? []).reduce((sum, a) => sum + (a.view_count ?? 0), 0)
  const totalLikes = (myAnswers ?? []).reduce((sum, a) => sum + (a.like_count ?? 0), 0)
  const totalComments = (myAnswers ?? []).reduce((sum, a) => sum + (a.comment_count ?? 0), 0)
  const featuredCount = (myAnswers ?? []).filter(a => a.featured_at).length

  const budgetRemaining = (profile?.answer_limit ?? 3) - (monthlyAnswers ?? 0)

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <section className="flex items-start gap-4">
        <Avatar src={profile?.avatar_url} alt={profile?.display_name || 'User'} size={64} />
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

      {/* Email verification banner */}
      {!profile?.email_verified_at && <VerifyEmailBanner />}

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">
            {monthlyAnswers ?? 0} / {profile?.answer_limit ?? 3}
          </p>
          <p className="text-xs text-warm-500 mt-1">Budget Used</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{totalAnswers ?? 0}</p>
          <p className="text-xs text-warm-500 mt-1">Answers</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{totalViews}</p>
          <p className="text-xs text-warm-500 mt-1">Views</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{totalLikes}</p>
          <p className="text-xs text-warm-500 mt-1">Likes</p>
        </div>
      </section>

      {/* Engagement breakdown */}
      <section className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-warm-200 p-3 text-center">
          <p className="text-lg font-bold text-warm-900">{totalComments}</p>
          <p className="text-xs text-warm-500">Comments</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-3 text-center">
          <p className="text-lg font-bold text-warm-900">{featuredCount}</p>
          <p className="text-xs text-warm-500">Featured</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-3 text-center">
          <p className="text-lg font-bold text-warm-900">
            {questionsThisMonth > 0
              ? `${Math.round(((monthlyAnswers ?? 0) / questionsThisMonth) * 100)}%`
              : '—'}
          </p>
          <p className="text-xs text-warm-500">Selectivity</p>
        </div>
      </section>

      {/* Answer performance table */}
      {myAnswers && myAnswers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-3">Your Answers</h2>
          <div className="bg-white rounded-lg border border-warm-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-200 bg-warm-50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-warm-500">Question</th>
                  <th className="text-center px-2 py-2 text-xs font-medium text-warm-500">Views</th>
                  <th className="text-center px-2 py-2 text-xs font-medium text-warm-500">Likes</th>
                  <th className="text-center px-2 py-2 text-xs font-medium text-warm-500">Comments</th>
                </tr>
              </thead>
              <tbody>
                {myAnswers.map((a) => (
                  <tr key={a.id} className="border-b border-warm-100 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/answers/${a.id}`}
                        className="text-warm-800 hover:underline line-clamp-1"
                      >
                        {a.questions?.body}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-warm-400">
                          {format(new Date(a.created_at), 'MMM d')}
                        </span>
                        {a.featured_at && (
                          <span className="text-xs text-amber-600 font-medium">Featured</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-2 py-3 text-warm-600">{a.view_count ?? 0}</td>
                    <td className="text-center px-2 py-3 text-warm-600">{a.like_count ?? 0}</td>
                    <td className="text-center px-2 py-3 text-warm-600">{a.comment_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {budgetRemaining > 0 ? (
        <p className="text-sm text-warm-500 mt-1">
          {budgetRemaining} answer{budgetRemaining !== 1 ? 's' : ''} remaining this month
        </p>
      ) : (
        <p className="text-sm text-warm-400 mt-1">
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
            className="inline-block mt-3 px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors"
          >
            Answer today&apos;s question
          </Link>
        </section>
      )}

      {/* Saved Questions */}
      {savedQuestions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-3">
            Saved Questions
          </h2>
          <div className="space-y-2">
            {savedQuestions.map((q) => {
              const isUpcoming = q.publish_date > todayStr
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between bg-white rounded-lg border border-warm-200 p-4"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      {q.category && (
                        <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                          {q.category}
                        </span>
                      )}
                      <span className="text-xs text-warm-400">
                        {format(new Date(q.publish_date), 'MMM d')}
                      </span>
                      {isUpcoming && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <Link
                      href={isUpcoming ? '/questions/upcoming' : `/q/${q.slug}`}
                      className="text-sm font-medium text-warm-900 hover:underline"
                    >
                      {q.body}
                    </Link>
                  </div>
                  <BookmarkButton
                    questionId={q.id}
                    isBookmarked={true}
                    className="flex-shrink-0"
                  />
                </div>
              )
            })}
          </div>
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

      {/* API Keys */}
      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-warm-800">API Access</h2>
            <p className="text-sm text-warm-500 mt-1">
              Embed your Ethos answers on your website.
            </p>
          </div>
          <Link
            href="/dashboard/api"
            className="px-4 py-2 bg-warm-100 text-warm-700 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors"
          >
            Manage Keys
          </Link>
        </div>
      </section>

      {/* Edit Profile */}
      <section>
        <h2 className="text-lg font-semibold text-warm-800 mb-4">Edit Profile</h2>
        <div className="bg-white rounded-lg border border-warm-200 p-6">
          <EditProfileForm profile={profile} />
        </div>
      </section>

      {/* Danger zone */}
      <section className="pt-4 border-t border-warm-200">
        <DeleteAccountSection />
      </section>
    </div>
  )
}
