'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function signInWithLinkedIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-3xl font-bold text-warm-900 mb-2">Ethos</h1>
      <p className="text-warm-600 mb-8">Sign in to share your expertise</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={signInWithGoogle}
          className="w-full px-4 py-3 bg-white border border-warm-200 rounded-lg text-warm-800 font-medium hover:bg-warm-50 transition-colors"
        >
          Sign in with Google
        </button>
        <button
          onClick={signInWithLinkedIn}
          className="w-full px-4 py-3 bg-[#0A66C2] text-white rounded-lg font-medium hover:bg-[#004182] transition-colors"
        >
          Sign in with LinkedIn
        </button>
      </div>
    </div>
  )
}
