import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Claim invite code if provided (fire-and-forget, don't block login)
        if (inviteCode) {
          supabase
            .from('invites')
            .update({
              claimed_by: user.id,
              claimed_at: new Date().toISOString(),
            })
            .eq('code', inviteCode)
            .is('claimed_by', null)
            .then(() => {
              // Also record who invited this user
              supabase
                .from('invites')
                .select('created_by')
                .eq('code', inviteCode)
                .single()
                .then(({ data: invite }) => {
                  if (invite?.created_by) {
                    supabase
                      .from('profiles')
                      .update({ invited_by: invite.created_by })
                      .eq('id', user.id)
                      .then(() => {})
                  }
                })
            })
        }

        // Check if profile is complete (new users have null headline)
        const { data: profile } = await supabase
          .from('profiles')
          .select('headline')
          .eq('id', user.id)
          .single()

        if (!profile?.headline) {
          return NextResponse.redirect(`${origin}/welcome`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth error — redirect to error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
