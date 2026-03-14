import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import QuestionCard from '@/components/QuestionCard'

export const revalidate = 300

export const metadata = {
  title: 'Questions Archive',
  description: 'Browse every question asked on Ethos and read all expert perspectives.',
}

export default async function QuestionsPage() {
  const supabase = await createClient()

  const { data: questions } = await supabase
    .from('questions')
    .select('*, answers(count, view_count, created_at), question_topics(topics(name, slug))')
    .lte('publish_date', new Date().toISOString().slice(0, 10))
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })

  // Compute per-question engagement stats
  const enriched = (questions ?? []).map((q) => {
    const answers = q.answers ?? []
    const answerCount = answers.length > 0 && typeof answers[0].count === 'number'
      ? answers[0].count
      : answers.length
    const totalViews = answers.reduce((sum, a) => sum + (a.view_count ?? 0), 0)
    const latestAnswer = answers
      .filter(a => a.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    return { ...q, answerCount, totalViews, latestAnswer, isPopular: answerCount > 5 }
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warm-900">
          Questions Archive
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
            Go to today's question
          </Link>
        </div>
      )}
    </div>
  )
}
