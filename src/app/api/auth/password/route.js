import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

const SITE_PASSWORD = process.env.SITE_PASSWORD
if (!SITE_PASSWORD) {
  throw new Error('SITE_PASSWORD environment variable is required')
}

export async function POST(request) {
  // Rate limit: 5 attempts per 15 minutes per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimit({ key: `password:${ip}`, limit: 5, windowMs: 15 * 60 * 1000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  const { password } = await request.json()

  if (password === SITE_PASSWORD) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('site_access', 'granted', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  }

  return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
}
