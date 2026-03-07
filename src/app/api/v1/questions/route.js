import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateApiKey } from '@/lib/apiAuth'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request) {
  const apiKey = await validateApiKey(request)
  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const rl = await rateLimit({ key: `api:${apiKey.id}`, limit: 100, windowMs: 60 * 60 * 1000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const today = new Date().toISOString().slice(0, 10)

  const { data: questions, count } = await supabase
    .from('questions')
    .select('id, body, slug, category, publish_date, status', { count: 'exact' })
    .lte('publish_date', today)
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({
    data: questions ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
}
