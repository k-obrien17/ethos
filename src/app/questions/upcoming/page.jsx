import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, addDays } from 'date-fns'

export const metadata = {
  title: 'Upcoming Questions',
  description: 'Preview questions coming up this week on Ethos.',
}

export default async function UpcomingQuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get user's preview depth preference
  const { data: profile } = await supabase
    .from('profiles')
    .select('queue_preview_days')
    .eq('id', user.id)
    .single()

  const previewDays = profile?.queue_preview_days ?? 3
  const today = new Date().toISOString().slice(0, 10)
  const maxDate = addDays(new Date(), previewDays).toISOString().slice(0, 10)

  // Fetch upcoming questions within preview window
  const { data: questions } = await supabase
    .from('questions')
    .select('id, body, slug, category, publish_date')
    .gt('publish_date', today)
    .lte('publish_date', maxDate)
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: true })

  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-2">
        Upcoming Questions
      </h1>
      <p className="text-sm text-warm-500 mb-6">
        Preview the next {previewDays} {previewDays === 1 ? 'day' : 'days'} of questions.
      </p>

      {questions && questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-6 bg-white rounded-lg border border-warm-200"
            >
              <div className="flex items-center gap-2 mb-2">
                {q.category && (
                  <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                    {q.category}
                  </span>
                )}
                <span className="text-xs text-warm-400">
                  {format(new Date(q.publish_date), 'EEEE, MMMM d')}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-warm-900">
                {q.body}
              </h2>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-warm-500 text-sm text-center py-8">
          No upcoming questions scheduled in the next {previewDays} days.
        </p>
      )}
    </div>
  )
}
