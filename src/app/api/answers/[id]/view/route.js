import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rateLimit'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing answer ID' }, { status: 400 })
  }

  // Rate limit: 1 view per IP per answer per minute
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimit({ key: `view:${ip}:${id}`, limit: 1, windowMs: 60 * 1000 })
  if (!rl.success) {
    return NextResponse.json({ success: true })
  }

  const admin = createAdminClient()

  const { error } = await admin.rpc('increment_view_count', { answer_id: id })

  if (error) {
    console.error('[view] increment failed:', error)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
