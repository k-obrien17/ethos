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

  const { slug } = await params
  const supabase = createAdminClient()

  const { data: question } = await supabase
    .from('questions')
    .select('id, body, slug, category, publish_date, status')
    .eq('slug', slug)
    .single()

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const { data: answers } = await supabase
    .from('answers')
    .select(`
      id, body, word_count, like_count, comment_count, featured_at, created_at,
      profiles!answers_expert_id_fkey(display_name, handle, headline)
    `)
    .eq('question_id', question.id)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })

  return NextResponse.json({
    ...question,
    answers: (answers ?? []).map(a => ({
      id: a.id,
      body: a.body,
      word_count: a.word_count,
      like_count: a.like_count,
      comment_count: a.comment_count,
      featured: !!a.featured_at,
      created_at: a.created_at,
      expert: {
        name: a.profiles?.display_name,
        handle: a.profiles?.handle,
        headline: a.profiles?.headline,
      },
    })),
  })
}
