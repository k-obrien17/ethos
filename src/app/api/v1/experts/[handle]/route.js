import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateApiKey } from '@/lib/apiAuth'
import { rateLimit } from '@/lib/rateLimit'

export async function GET(request, { params }) {
  const apiKey = await validateApiKey(request)
  if (!apiKey) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const rl = await rateLimit({ key: `api:${apiKey.id}`, limit: 100, windowMs: 60 * 60 * 1000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { handle } = await params
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, handle, headline, organization, bio, avatar_url, follower_count, following_count, linkedin_url, twitter_url, website_url')
    .eq('handle', handle)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Expert not found' }, { status: 404 })
  }

  const { data: answers } = await supabase
    .from('answers')
    .select(`
      id, body, word_count, like_count, comment_count, featured_at, created_at,
      questions!inner(body, slug, category, publish_date)
    `)
    .eq('expert_id', profile.id)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })

  const { id, ...publicProfile } = profile

  return NextResponse.json({
    ...publicProfile,
    answers: (answers ?? []).map(a => ({
      id: a.id,
      body: a.body,
      word_count: a.word_count,
      like_count: a.like_count,
      comment_count: a.comment_count,
      featured: !!a.featured_at,
      created_at: a.created_at,
      question: {
        body: a.questions?.body,
        slug: a.questions?.slug,
        category: a.questions?.category,
        publish_date: a.questions?.publish_date,
      },
    })),
  })
}
