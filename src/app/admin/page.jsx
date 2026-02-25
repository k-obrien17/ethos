import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, addDays, differenceInDays } from 'date-fns'
import RescheduleForm from '@/components/admin/RescheduleForm'

export const metadata = { title: 'Admin Dashboard — Ethos' }

function StatCard({ label, value, sublabel, color }) {
  const colorClasses = {
    warm: 'bg-warm-50 border-warm-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
  }

  return (
    <div className={`rounded-lg border px-4 py-3 ${colorClasses[color] || colorClasses.warm}`}>
      <p className="text-2xl font-bold text-warm-900">{value}</p>
      <p className="text-sm font-medium text-warm-700">{label}</p>
      {sublabel && (
        <p className="text-xs text-warm-500 mt-0.5">{sublabel}</p>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const classes = {
    draft: 'bg-warm-100 text-warm-600',
    scheduled: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes[status] || classes.draft}`}>
      {status}
    </span>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const todayStr = new Date().toISOString().slice(0, 10)

  // Fetch all questions for stats
  const { data: allQuestions } = await supabase
    .from('questions')
    .select('id, body, slug, category, publish_date, status')
    .order('publish_date', { ascending: true })

  const questions = allQuestions ?? []
  const drafts = questions.filter(q => q.status === 'draft' || !q.publish_date)
  const upcoming = questions.filter(q =>
    q.publish_date && q.publish_date >= todayStr && q.status === 'scheduled'
  )
  const published = questions.filter(q =>
    q.status === 'published' || (q.publish_date && q.publish_date < todayStr)
  )

  // Queue depth: how many days of scheduled questions from today
  const lastScheduledDate = upcoming.length > 0
    ? upcoming[upcoming.length - 1].publish_date
    : null
  const queueDepthDays = lastScheduledDate
    ? differenceInDays(new Date(lastScheduledDate), new Date(todayStr))
    : 0

  // Gap detection: find missing dates in the upcoming range
  const scheduledDates = new Set(upcoming.map(q => q.publish_date))
  const gaps = []
  if (lastScheduledDate) {
    let d = new Date(todayStr)
    const end = new Date(lastScheduledDate)
    while (d <= end) {
      const ds = d.toISOString().slice(0, 10)
      if (!scheduledDates.has(ds)) gaps.push(ds)
      d = addDays(d, 1)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-900">Dashboard</h1>
        <Link
          href="/admin/questions/new"
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          New Question
        </Link>
      </div>

      {/* Summary stats */}
      <section className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={questions.length}
          sublabel="all questions"
          color="warm"
        />
        <StatCard
          label="Drafts"
          value={drafts.length}
          sublabel="need scheduling"
          color="blue"
        />
        <StatCard
          label="Scheduled"
          value={upcoming.length}
          sublabel="in the queue"
          color="amber"
        />
        <StatCard
          label="Published"
          value={published.length}
          sublabel="already live"
          color="green"
        />
      </section>

      {/* Queue depth + gaps */}
      <section className="bg-white border border-warm-200 rounded-lg px-5 py-4 space-y-3">
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide">
          Queue Depth
        </h2>
        {upcoming.length > 0 ? (
          <>
            <p className="text-warm-900 text-sm">
              <span className="font-semibold text-warm-900">{queueDepthDays} days</span>
              {' '}of content scheduled ({upcoming.length} question{upcoming.length !== 1 ? 's' : ''}, through{' '}
              {format(new Date(lastScheduledDate), 'MMM d, yyyy')})
            </p>
            {/* Depth bar */}
            <div className="w-full bg-warm-100 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (queueDepthDays / 30) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-warm-400">
              Bar represents 30-day target
            </p>
          </>
        ) : (
          <p className="text-warm-500 text-sm">
            No questions scheduled. Create and schedule questions to build your queue.
          </p>
        )}

        {gaps.length > 0 && (
          <div className="border-t border-warm-100 pt-3 mt-3">
            <p className="text-sm font-medium text-amber-700">
              {gaps.length} gap{gaps.length !== 1 ? 's' : ''} in schedule
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {gaps.map(date => (
                <span
                  key={date}
                  className="text-xs px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded"
                >
                  {format(new Date(date), 'MMM d')}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Upcoming queue */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Upcoming Queue ({upcoming.length})
        </h2>
        {upcoming.length > 0 ? (
          <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
            {upcoming.map(q => (
              <div key={q.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-warm-900 leading-snug">
                    {q.body.length > 80 ? q.body.slice(0, 80) + '...' : q.body}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <StatusBadge status={q.status} />
                    {q.category && (
                      <span className="text-xs text-warm-500">{q.category}</span>
                    )}
                    <span className="text-xs text-warm-400">
                      {format(new Date(q.publish_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <RescheduleForm questionId={q.id} currentDate={q.publish_date} />
                  <Link
                    href={`/admin/questions/${q.id}/edit`}
                    className="text-xs text-warm-500 hover:text-warm-700 transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-warm-200 rounded-lg px-4 py-6 text-center">
            <p className="text-sm text-warm-500">
              No upcoming questions. Schedule drafts or{' '}
              <Link href="/admin/questions/new" className="text-warm-700 hover:text-warm-900 underline">
                create a new question
              </Link>.
            </p>
          </div>
        )}
      </section>

      {/* Unscheduled drafts */}
      {drafts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
            Unscheduled Drafts ({drafts.length})
          </h2>
          <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
            {drafts.map(q => (
              <div key={q.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-warm-900 leading-snug">
                    {q.body.length > 80 ? q.body.slice(0, 80) + '...' : q.body}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <StatusBadge status={q.status || 'draft'} />
                    {q.category && (
                      <span className="text-xs text-warm-500">{q.category}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <RescheduleForm questionId={q.id} />
                  <Link
                    href={`/admin/questions/${q.id}/edit`}
                    className="text-xs text-warm-500 hover:text-warm-700 transition-colors"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
