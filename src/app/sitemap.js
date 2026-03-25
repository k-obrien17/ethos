import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ethos-daily.vercel.app'

export default async function sitemap() {
  const supabase = createAdminClient()

  const [{ data: questions }, { data: profiles }, { data: topics }, { data: answers }] = await Promise.all([
    supabase
      .from('questions')
      .select('slug, publish_date')
      .in('status', ['scheduled', 'published'])
      .lte('publish_date', new Date().toISOString().slice(0, 10))
      .order('publish_date', { ascending: false }),
    supabase
      .from('profiles')
      .select('handle, updated_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('topics')
      .select('slug')
      .order('name'),
    supabase
      .from('answers')
      .select('id, created_at')
      .order('created_at', { ascending: false }),
  ])

  const staticPages = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/questions`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/topics`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/experts`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/for-companies`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/join`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/login`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const questionPages = (questions ?? []).map(q => ({
    url: `${BASE_URL}/q/${q.slug}`,
    lastModified: new Date(q.publish_date),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  const profilePages = (profiles ?? []).map(p => ({
    url: `${BASE_URL}/expert/${p.handle}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const answerPages = (answers ?? []).map(a => ({
    url: `${BASE_URL}/answers/${a.id}`,
    lastModified: a.created_at ? new Date(a.created_at) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  const topicPages = (topics ?? []).map(t => ({
    url: `${BASE_URL}/topics/${t.slug}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  return [...staticPages, ...questionPages, ...answerPages, ...profilePages, ...topicPages]
}
