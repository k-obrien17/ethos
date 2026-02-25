'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import BudgetIndicator from '@/components/BudgetIndicator'

export default function HeaderAuth({ user, budgetData }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-warm-700 hover:text-warm-900"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {budgetData && (
        <BudgetIndicator used={budgetData.used} limit={budgetData.limit} />
      )}
      <button
        onClick={handleSignOut}
        className="text-sm text-warm-500 hover:text-warm-700"
      >
        Sign out
      </button>
    </div>
  )
}
