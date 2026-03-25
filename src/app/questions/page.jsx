import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import QuestionCard from '@/components/QuestionCard'

export const revalidate = 300

export const metadata = {
  title: 'Previous Questions',
  description: 'Browse every question asked on Ethos and read all expert perspectives.',
}

export default async function QuestionsPage() {
  const supabase = await createClient()

  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase
      .from('questions')
      .select('*, question_topics(topics(name, slug))')
      .lte('publish_date', new Date().toISOString().slice(0, 10))
      .in('status', ['scheduled', 'published'])
      .order('publish_date', { ascending: false }),
    supabase
      .from('answers')
      .select('question_id, view_count, created_at')
      .is('hidden_at', null),
  ])

  // Build per-question stats from answers
  const statsMap = {}
  for (const a of answers ?? []) {
    if (!statsMap[a.question_id]) statsMap[a.question_id] = { count: 0, views: 0, latest: null }
    const s = statsMap[a.question_id]
    s.count++
    s.views += a.view_count ?? 0
    if (!s.latest || a.created_at > s.latest) s.latest = a.created_at
  }

  const enriched = (questions ?? []).map((q) => {
    const s = statsMap[q.id] || { count: 0, views: 0, latest: null }
    return { ...q, answerCount: s.count, totalViews: s.views, latestAnswer: s.latest ? { created_at: s.latest } : null, isPopular: s.count > 5 }
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warm-900">
          Previous Questions
        </h1>
        <p className="text-warm-500 text-sm mt-1">
          Browse every question asked on Ethos and read all expert perspectives.
        </p>
      </div>
      {enriched.length > 0 ? (
        <div className="divide-y divide-warm-100">
          {enriched.map((q) => (
            <div key={q.id} className="relative">
              {q.isPopular && (
                <span className="absolute top-4 right-0 text-xs px-2 py-0.5 rounded-full bg-accent-50 text-accent-600 font-medium">
                  Popular
                </span>
              )}
              <QuestionCard
                question={q}
                answerCount={q.answerCount}
              />
              {(q.totalViews > 0) && (
                <div className="flex items-center gap-3 text-xs text-warm-400 -mt-2 pb-2 pl-0">
                  <span>{q.totalViews} total views</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-warm-600 mb-2">No questions published yet.</p>
          <p className="text-warm-500 text-sm mb-4">
            New questions are published regularly. Check back soon or browse past questions.
          </p>
          <Link href="/" className="inline-block px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors">
            Go to today&apos;s question
          </Link>
        </div>
      )}
    </div>
  )
}
