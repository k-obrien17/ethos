import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EmailPreferencesForm from '@/components/EmailPreferencesForm'
import NotificationFeed from '@/components/NotificationFeed'

export const metadata = {
  title: 'Notifications',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile first to determine in-app preferences for notification filtering
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_preferences')
    .eq('id', user.id)
    .single()

  // Build list of enabled in-app notification types from preferences
  const prefs = profile?.email_preferences || {}
  const inAppMap = {
    comments_inapp: 'comment',
    comment_replies_inapp: 'comment_reply',
    follows_inapp: 'follow',
    followed_expert_posts_inapp: 'followed_expert_posted',
    featured_inapp: 'featured',
  }
  // Default to true (show) if preference not yet set. Always include 'like' (no toggle).
  const enabledInAppTypes = ['like']
  for (const [prefKey, notifType] of Object.entries(inAppMap)) {
    if (prefs[prefKey] !== false) enabledInAppTypes.push(notifType)
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select(`
      id, type, body, read_at, created_at,
      actor:profiles!notifications_actor_id_fkey(display_name, avatar_url),
      answer:answers!notifications_answer_id_fkey(id, body, questions(slug, body))
    `)
    .eq('user_id', user.id)
    .in('type', enabledInAppTypes)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-warm-500 hover:text-warm-700"
        >
          &larr; Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-warm-900 mt-3">
          Notifications
        </h1>
      </div>

      <section className="bg-white rounded-lg border border-warm-200">
        <NotificationFeed notifications={notifications || []} />
      </section>

      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <h2 className="text-lg font-semibold text-warm-900 mb-4">Notification Preferences</h2>
        <EmailPreferencesForm preferences={profile?.email_preferences} />
      </section>
    </div>
  )
}
