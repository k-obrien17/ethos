import { createClient } from '@/lib/supabase/server'
import QuestionCard from '@/components/QuestionCard'

export const revalidate = 300

export const metadata = {
  title: 'Questions',
  description: 'Browse all expert questions on Ethos.',
}

export default async function QuestionsPage() {
  const supabase = await createClient()

  const { data: questions } = await supabase
    .from('questions')
    .select('*, answers(count)')
    .lte('publish_date', new Date().toISOString().slice(0, 10))
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-6">
        All Questions
      </h1>
      {questions && questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              answerCount={q.answers?.[0]?.count ?? 0}
            />
          ))}
        </div>
      ) : (
        <p className="text-warm-500 text-sm text-center py-8">
          No questions published yet.
        </p>
      )}
    </div>
  )
}
