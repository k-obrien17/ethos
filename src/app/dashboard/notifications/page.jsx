import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EmailPreferencesForm from '@/components/EmailPreferencesForm'

export const metadata = {
  title: 'Notification Preferences',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('email_preferences')
    .eq('id', user.id)
    .single()

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
          Notification Preferences
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Choose which emails you'd like to receive from Ethos.
        </p>
      </div>

      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <EmailPreferencesForm preferences={profile?.email_preferences} />
      </section>
    </div>
  )
}
