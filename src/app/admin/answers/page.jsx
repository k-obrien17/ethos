import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import ToggleHideButton from '@/components/admin/ToggleHideButton'
import ToggleFeatureButton from '@/components/admin/ToggleFeatureButton'

export const metadata = { title: 'Answer Moderation — Admin' }

export default async function AdminAnswersPage() {
  const supabase = await createClient()

  const { data: answers } = await supabase
    .from('answers')
    .select(`
      id, body, word_count, created_at, hidden_at, hidden_by, featured_at,
      profiles!answers_expert_id_fkey (display_name, handle),
      questions!question_id (body, slug, publish_date)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-warm-900">Answer Moderation</h1>

      {(answers ?? []).map((answer) => (
        <article
          key={answer.id}
          className={`p-4 rounded-lg border ${
            answer.hidden_at
              ? 'border-red-200 bg-red-50/50'
              : 'border-warm-200 bg-white'
          }`}
        >
          {/* Expert name + question context */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium text-warm-900">
                {answer.profiles?.display_name}
              </span>
              <span className="text-warm-400 text-sm ml-2">
                @{answer.profiles?.handle}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ToggleFeatureButton
                answerId={answer.id}
                isFeatured={!!answer.featured_at}
              />
              <ToggleHideButton
                answerId={answer.id}
                isHidden={!!answer.hidden_at}
              />
            </div>
          </div>

          {/* Question context */}
          <p className="text-sm text-warm-500 mb-2">
            Q: {answer.questions?.body?.slice(0, 100)}
          </p>

          {/* Answer preview */}
          <p className="text-warm-700 text-sm line-clamp-3">
            {answer.body?.slice(0, 300)}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs text-warm-400">
            <span>{answer.word_count} words</span>
            <span>{format(new Date(answer.created_at), 'MMM d, yyyy')}</span>
            {answer.featured_at && (
              <span className="text-amber-600 font-medium">
                Featured
              </span>
            )}
            {answer.hidden_at && (
              <span className="text-red-500 font-medium">
                Hidden {format(new Date(answer.hidden_at), 'MMM d')}
              </span>
            )}
          </div>
        </article>
      ))}

      {(!answers || answers.length === 0) && (
        <p className="text-warm-500 text-sm text-center py-8">
          No answers yet.
        </p>
      )}
    </div>
  )
}
