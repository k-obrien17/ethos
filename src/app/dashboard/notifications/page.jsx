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

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase
      .from('profiles')
      .select('email_preferences')
      .eq('id', user.id)
      .single(),
    supabase
      .from('notifications')
      .select(`
        id, type, body, read_at, created_at,
        actor:profiles!notifications_actor_id_fkey(display_name, avatar_url),
        answer:answers!notifications_answer_id_fkey(id, body, questions(slug, body))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

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
        <h2 className="text-lg font-semibold text-warm-900 mb-4">Email Preferences</h2>
        <EmailPreferencesForm preferences={profile?.email_preferences} />
      </section>
    </div>
  )
}
