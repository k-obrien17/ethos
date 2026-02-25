import { createClient } from '@/lib/supabase/server'
import QuestionCard from '@/components/QuestionCard'
import AnswerCard from '@/components/AnswerCard'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  // Fetch today's question
  const { data: todayQuestion } = await supabase
    .from('questions')
    .select('*')
    .lte('publish_date', today)
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })
    .limit(1)
    .single()

  // Fetch answers for today's question (with expert profiles)
  let todayAnswers = []
  if (todayQuestion) {
    const { data } = await supabase
      .from('answers')
      .select(`
        *,
        profiles!inner (
          display_name,
          handle,
          avatar_url,
          answer_limit
        )
      `)
      .eq('question_id', todayQuestion.id)
      .order('created_at', { ascending: false })

    todayAnswers = data ?? []
  }

  // Fetch recent past questions with answer counts
  const { data: recentQuestions } = await supabase
    .from('questions')
    .select('*, answers(count)')
    .lt('publish_date', today)
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      {/* Today's question */}
      {todayQuestion ? (
        <section>
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-2">
            Today&apos;s Question
          </p>
          <div className="p-6 bg-white rounded-lg border-2 border-warm-300">
            {todayQuestion.category && (
              <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                {todayQuestion.category}
              </span>
            )}
            <h1 className="text-2xl font-bold text-warm-900 mt-1">
              {todayQuestion.body}
            </h1>
            <p className="text-sm text-warm-500 mt-3">
              {todayAnswers.length} {todayAnswers.length === 1 ? 'expert has' : 'experts have'} answered
            </p>
          </div>

          {/* Today's answers */}
          {todayAnswers.length > 0 && (
            <div className="mt-6 space-y-4">
              {todayAnswers.map((answer) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  expert={answer.profiles}
                  monthlyUsage={null}
                />
              ))}
            </div>
          )}

          {todayAnswers.length === 0 && (
            <p className="mt-4 text-warm-500 text-sm">
              No answers yet. Be the first expert to weigh in.
            </p>
          )}
        </section>
      ) : (
        <section className="text-center py-12">
          <h1 className="text-2xl font-bold text-warm-900 mb-2">Ethos</h1>
          <p className="text-warm-600">
            What you choose to answer reveals what you stand for.
          </p>
          <p className="text-warm-500 text-sm mt-2">
            No question published yet today. Check back soon.
          </p>
        </section>
      )}

      {/* Recent questions feed */}
      {recentQuestions && recentQuestions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-warm-800">
              Recent Questions
            </h2>
            <Link
              href="/questions"
              className="text-sm text-warm-500 hover:text-warm-700"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answerCount={q.answers?.[0]?.count ?? 0}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
