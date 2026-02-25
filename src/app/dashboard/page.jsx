import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, handle, avatar_url, answer_limit')
    .eq('id', user.id)
    .single()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-warm-900">Dashboard</h1>
      <p className="text-warm-600 mt-2">
        Welcome, {profile?.display_name ?? 'Expert'}
      </p>
      <p className="text-warm-500 mt-1 text-sm">
        Handle: @{profile?.handle} · Answer limit: {profile?.answer_limit}/month
      </p>
    </main>
  )
}
