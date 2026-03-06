import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateApiKey } from '@/lib/apiAuth'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request, { params }) {
  const apiKey = await validateApiKey(request)
  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const rl = rateLimit({ key: `api:${apiKey.id}`, limit: 100, windowMs: 60 * 60 * 1000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { id } = await params
  const supabase = createAdminClient()

  const { data: answer } = await supabase
    .from('answers')
    .select(`
      id, body, word_count, like_count, comment_count, featured_at, created_at,
      profiles!answers_expert_id_fkey(display_name, handle, headline, avatar_url),
      questions!inner(body, slug, category, publish_date)
    `)
    .eq('id', id)
    .is('hidden_at', null)
    .single()

  if (!answer) {
    return NextResponse.json({ error: 'Answer not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: answer.id,
    body: answer.body,
    word_count: answer.word_count,
    like_count: answer.like_count,
    comment_count: answer.comment_count,
    featured: !!answer.featured_at,
    created_at: answer.created_at,
    expert: {
      name: answer.profiles?.display_name,
      handle: answer.profiles?.handle,
      headline: answer.profiles?.headline,
      avatar_url: answer.profiles?.avatar_url,
    },
    question: {
      body: answer.questions?.body,
      slug: answer.questions?.slug,
      category: answer.questions?.category,
      publish_date: answer.questions?.publish_date,
    },
  })
}
