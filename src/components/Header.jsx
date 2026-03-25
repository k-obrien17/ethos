import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HeaderAuth from '@/components/HeaderAuth'
import SearchBar from '@/components/SearchBar'
import MobileNav from '@/components/MobileNav'
import NotificationBell from '@/components/NotificationBell'
import NavLink from '@/components/NavLink'

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let budgetData = null
  let unreadCount = 0
  if (user) {
    try {
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
    } catch {
      // Fallback — header renders with defaults if queries fail
    }
  }

  return (
    <header className="border-b border-warm-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      <nav className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-warm-900 tracking-tight">
          Credo
        </Link>
        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-5">
          <SearchBar />
          <NavLink href="/topics">Topics</NavLink>
          <NavLink href="/experts">Experts</NavLink>
          <NavLink href="/questions">Previous Questions</NavLink>
          <NavLink href="/leaderboard">Leaderboard</NavLink>
          <NavLink href="/for-companies">For Companies</NavLink>
          {user && <NavLink href="/following">Following</NavLink>}
          {user && <NotificationBell unreadCount={unreadCount} />}
          <HeaderAuth user={user} budgetData={budgetData} />
        </div>
        {/* Mobile nav */}
        <div className="flex sm:hidden items-center gap-2">
          <SearchBar />
          {user && <NotificationBell unreadCount={unreadCount} />}
          <MobileNav isAuthenticated={!!user} budgetData={budgetData} />
        </div>
      </nav>
    </header>
  )
}
