'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(null)

  async function signInWithGoogle() {
    setLoading('google')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function signInWithLinkedIn() {
    setLoading('linkedin')
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-2xl font-bold text-warm-900 mb-2">Ethos</h1>
      <p className="text-warm-600 mb-8">Sign in to share your expertise</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={signInWithGoogle}
          disabled={loading !== null}
          className="w-full px-4 py-3 bg-white border border-warm-200 rounded-lg text-warm-800 font-medium hover:bg-warm-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'google' ? 'Redirecting...' : 'Sign in with Google'}
        </button>
        <button
          onClick={signInWithLinkedIn}
          disabled={loading !== null}
          className="w-full px-4 py-3 bg-[#0A66C2] text-white rounded-lg font-medium hover:bg-[#004182] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'linkedin' ? 'Redirecting...' : 'Sign in with LinkedIn'}
        </button>
      </div>
    </div>
  )
}
