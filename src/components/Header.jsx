import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import HeaderAuth from '@/components/HeaderAuth'
import SearchBar from '@/components/SearchBar'

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="text-warm-600 hover:text-warm-900 text-sm font-medium"
    >
      {children}
    </Link>
  )
}

export default async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let budgetData = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('answer_limit')
      .eq('id', user.id)
      .single()

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString()

    const { count } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('expert_id', user.id)
      .gte('created_at', startOfMonth)

    budgetData = {
      used: count ?? 0,
      limit: profile?.answer_limit ?? 3,
    }
  }

  return (
    <header className="border-b border-warm-200 bg-warm-50 relative">
      <nav className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-warm-900">
          Ethos
        </Link>
        <div className="flex items-center gap-4">
          <SearchBar />
          <Link
            href="/topics"
            className="text-warm-600 hover:text-warm-900 text-sm font-medium"
          >
            Topics
          </Link>
          <Link
            href="/questions"
            className="text-warm-600 hover:text-warm-900 text-sm font-medium"
          >
            Archive
          </Link>
          {user && (
            <Link
              href="/questions/upcoming"
              className="text-warm-600 hover:text-warm-900 text-sm font-medium"
            >
              Upcoming
            </Link>
          )}
          <HeaderAuth user={user} budgetData={budgetData} />
        </div>
      </nav>
    </header>
  )
}
