import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HeaderAuth from '@/components/HeaderAuth'
import SearchBar from '@/components/SearchBar'
import MobileNav from '@/components/MobileNav'
import NotificationBell from '@/components/NotificationBell'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let budgetData = null
  let unreadCount = 0
  if (user) {
    const [{ data: profile }, { count: budgetCount }, { count: notifCount }] = await Promise.all([
      supabase
        .from('profiles')
        .select('answer_limit')
        .eq('id', user.id)
        .single(),
      supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('expert_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ])

    budgetData = {
      used: budgetCount ?? 0,
      limit: profile?.answer_limit ?? 3,
    }
    unreadCount = notifCount ?? 0
  }

  return (
    <header className="border-b border-warm-200 bg-warm-50 relative">
      <nav className="mx-auto max-w-2xl px-4 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-warm-900">
          Ethos
        </Link>
        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4">
          <SearchBar />
          <Link href="/leaderboard" className="text-warm-600 hover:text-warm-900 text-sm font-medium">
            Leaderboard
          </Link>
          <Link href="/topics" className="text-warm-600 hover:text-warm-900 text-sm font-medium">
            Topics
          </Link>
          <Link href="/questions" className="text-warm-600 hover:text-warm-900 text-sm font-medium">
            Archive
          </Link>
          {user && (
            <Link href="/questions/upcoming" className="text-warm-600 hover:text-warm-900 text-sm font-medium">
              Upcoming
            </Link>
          )}
          {user && <NotificationBell unreadCount={unreadCount} />}
          <HeaderAuth user={user} budgetData={budgetData} />
        </div>
        {/* Mobile nav */}
        <div className="flex sm:hidden items-center gap-2">
          <SearchBar />
          {user && <NotificationBell unreadCount={unreadCount} />}
          <MobileNav isAuthenticated={!!user} />
        </div>
      </nav>
    </header>
  )
}
