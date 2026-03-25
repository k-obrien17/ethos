import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request) {
  const sitePassword = process.env.SITE_PASSWORD
  if (!sitePassword) {
    return NextResponse.json({ error: 'Site password not configured.' }, { status: 500 })
  }

  // Rate limit: 5 attempts per 15 minutes per IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimit({ key: `password:${ip}`, limit: 5, windowMs: 15 * 60 * 1000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  let password
  try {
    ({ password } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const passwordMatch = typeof password === 'string'
    && Buffer.byteLength(password) === Buffer.byteLength(sitePassword)
    && timingSafeEqual(Buffer.from(password), Buffer.from(sitePassword))

  if (passwordMatch) {
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
