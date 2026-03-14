'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Note: metadata for this page is defined in login/layout.jsx since this is a client component

export default function LoginPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(null)
  const [inviteCode, setInviteCode] = useState(searchParams.get('invite') || '')
  const [error, setError] = useState(null)

  async function signIn(provider) {
    setLoading(provider)
    setError(null)

    // If invite code provided, validate it first
    if (inviteCode.trim()) {
      const { data: invite } = await supabase
        .from('invites')
        .select('id, claimed_by, expires_at')
        .eq('code', inviteCode.trim().toUpperCase())
        .maybeSingle()

      if (!invite) {
        setError('Invalid invite code.')
        setLoading(null)
        return
      }
      if (invite.claimed_by) {
        setError('This invite code has already been used.')
        setLoading(null)
        return
      }
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setError('This invite code has expired.')
        setLoading(null)
        return
      }
    }

    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (inviteCode.trim()) {
      callbackUrl.searchParams.set('invite', inviteCode.trim().toUpperCase())
    }

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl.toString(),
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-xl font-semibold text-warm-900 tracking-tight mb-1">Ethos</h1>
      <p className="text-warm-400 text-sm mb-8">Sign in to share your perspective</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div>
          <label htmlFor="invite" className="block text-sm font-medium text-warm-700 mb-1">
            Invite code
          </label>
          <input
            id="invite"
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            placeholder="Enter your invite code"
            className="w-full px-3 py-2.5 border border-warm-200 rounded-md text-warm-900 text-sm placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent uppercase"
          />
          {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
          <p className="text-xs text-warm-400 mt-1">Have an invite? Enter it above. Already a member? Just sign in.</p>
        </div>

        <button
          onClick={() => signIn('google')}
          disabled={loading !== null}
          className="w-full px-4 py-2.5 bg-white border border-warm-200 rounded-md text-warm-800 text-sm font-medium hover:bg-warm-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'google' ? 'Redirecting...' : 'Sign in with Google'}
        </button>
        <button
          onClick={() => signIn('linkedin_oidc')}
          disabled={loading !== null}
          className="w-full px-4 py-2.5 bg-[#0A66C2] text-white rounded-md text-sm font-medium hover:bg-[#004182] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'linkedin_oidc' ? 'Redirecting...' : 'Sign in with LinkedIn'}
        </button>
      </div>
    </div>
  )
}
