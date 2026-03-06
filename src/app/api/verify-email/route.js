import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find profile by verification token
  const { data: profile, error: findError } = await admin
    .from('profiles')
    .select('id, email_verified_at')
    .eq('email_verify_token', token)
    .single()

  if (findError || !profile) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${siteUrl}/verify-email?error=invalid`)
  }

  if (profile.email_verified_at) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${siteUrl}/verify-email?already=true`)
  }

  // Mark as verified and rotate token
  await admin
    .from('profiles')
    .update({
      email_verified_at: new Date().toISOString(),
      email_verify_token: crypto.randomUUID(),
    })
    .eq('id', profile.id)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return NextResponse.redirect(`${siteUrl}/verify-email?success=true`)
}
