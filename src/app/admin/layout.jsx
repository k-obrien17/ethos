import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-4 mb-8 border-b border-warm-200 pb-4">
        <Link href="/admin" className="text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors">
          Dashboard
        </Link>
        <Link href="/admin/questions" className="text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors">
          Questions
        </Link>
        <Link href="/admin/answers" className="text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors">
          Answers
        </Link>
        <Link href="/admin/topics" className="text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors">
          Topics
        </Link>
        <Link href="/admin/invites" className="text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors">
          Invites
        </Link>
        <Link href="/admin/reports" className="text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors">
          Reports
        </Link>
        <Link href="/admin/analytics" className="text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors">
          Analytics
        </Link>
        <div className="flex-1" />
        <Link href="/" className="text-xs text-warm-400 hover:text-warm-600 transition-colors">
          &larr; Back to site
        </Link>
      </nav>
      {children}
    </div>
  )
}
