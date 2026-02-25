import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const type = searchParams.get('type') || 'all'

  if (!token) {
    return new NextResponse(htmlPage('Invalid Link', 'This unsubscribe link is invalid.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const admin = createAdminClient()

  // Look up user by unsubscribe token
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email_preferences')
    .eq('unsubscribe_token', token)
    .single()

  if (!profile) {
    return new NextResponse(htmlPage('Invalid Link', 'This unsubscribe link is invalid or expired.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Update preferences
  const prefs = profile.email_preferences || {}

  if (type === 'all') {
    Object.keys(prefs).forEach(key => { prefs[key] = false })
  } else if (prefs.hasOwnProperty(type)) {
    prefs[type] = false
  } else {
    return new NextResponse(htmlPage('Invalid Type', 'Unknown email type.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const { error } = await admin
    .from('profiles')
    .update({ email_preferences: prefs })
    .eq('id', profile.id)

  if (error) {
    return new NextResponse(htmlPage('Error', 'Something went wrong. Please try again later.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const message = type === 'all'
    ? 'You have been unsubscribed from all Ethos emails.'
    : `You have been unsubscribed from ${type.replace(/_/g, ' ')} emails.`

  return new NextResponse(htmlPage('Unsubscribed', message), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

function htmlPage(title, message) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} — Ethos</title></head>
<body style="margin:0;padding:0;background-color:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:400px;margin:80px auto;text-align:center;padding:32px 24px;">
    <h1 style="font-size:24px;font-weight:bold;color:#1c1917;margin-bottom:8px;">Ethos</h1>
    <h2 style="font-size:18px;color:#44403c;margin-bottom:12px;">${title}</h2>
    <p style="color:#78716c;font-size:14px;">${message}</p>
    <a href="${siteUrl}" style="display:inline-block;margin-top:24px;padding:10px 20px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">Back to Ethos</a>
  </div>
</body>
</html>`
}
