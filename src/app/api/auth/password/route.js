import { NextResponse } from 'next/server'

const SITE_PASSWORD = process.env.SITE_PASSWORD || 'ethos2026'

export async function POST(request) {
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
