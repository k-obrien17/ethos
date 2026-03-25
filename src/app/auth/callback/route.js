import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const inviteCode = searchParams.get('invite')
  const rawNext = searchParams.get('next') ?? '/'
  // Prevent open redirect — only allow relative paths
  const next = (rawNext.startsWith('/') && !rawNext.startsWith('//')) ? rawNext : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Claim invite code atomically — the .is('claimed_by', null) WHERE clause
        // prevents double-claims. We await to ensure it completes before continuing.
        if (inviteCode) {
          const { data: claimed, error: claimError } = await supabase
            .from('invites')
            .update({
              claimed_by: user.id,
              claimed_at: new Date().toISOString(),
            })
            .eq('code', inviteCode)
            .is('claimed_by', null)
            .select('created_by')
            .maybeSingle()

          // If claim succeeded, record who invited this user and set approval status
          if (claimed?.created_by && !claimError) {
            // Check if inviter is admin — admin invites auto-approve
            const { data: inviter } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', claimed.created_by)
              .single()

            const status = inviter?.role === 'admin' ? 'approved' : 'pending'
            await supabase
              .from('profiles')
              .update({ invited_by: claimed.created_by, status })
              .eq('id', user.id)
          }
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
