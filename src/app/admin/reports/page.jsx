import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import ReportActions from '@/components/admin/ReportActions'

export const metadata = { title: 'Content Queue — Admin' }

const REASON_LABELS = {
  spam: 'Spam',
  harassment: 'Harassment',
  ai_generated: 'AI-generated',
  off_topic: 'Off-topic',
  other: 'Other',
}

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-blue-100 text-blue-700',
  actioned: 'bg-red-100 text-red-700',
  dismissed: 'bg-warm-100 text-warm-500',
}

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(display_name, handle),
      answer:answers(id, body, profiles!answers_expert_id_fkey(display_name, handle), questions!question_id(slug, body)),
      comment:answer_comments(id, body, profiles(display_name, handle))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const pending = (reports ?? []).filter(r => r.status === 'pending')
  const resolved = (reports ?? []).filter(r => r.status !== 'pending')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-900">Content Queue</h1>
        {pending.length > 0 && (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
            {pending.length} pending
          </span>
        )}
      </div>

      {/* Pending reports */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Pending ({pending.length})
        </h2>
        {pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map(report => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-700 font-medium">All clear</p>
            <p className="text-green-600 text-sm mt-1">No pending reports to review.</p>
          </div>
        )}
      </section>

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
            Resolved ({resolved.length})
          </h2>
          <div className="space-y-3">
            {resolved.map(report => (
              <ReportCard key={report.id} report={report} resolved />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ReportCard({ report, resolved }) {
  const isAnswer = !!report.answer
  const isComment = !!report.comment

  return (
    <div className={`border rounded-lg p-4 ${resolved ? 'border-warm-200 bg-warm-50/50' : 'border-amber-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[report.status]}`}>
            {report.status}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-warm-100 text-warm-600">
            {REASON_LABELS[report.reason] || report.reason}
          </span>
          <span className="text-xs text-warm-400">
            {format(new Date(report.created_at), 'MMM d, h:mm a')}
          </span>
        </div>
        {!resolved && <ReportActions reportId={report.id} answerId={report.answer?.id} />}
      </div>

      <p className="text-xs text-warm-500 mb-2">
        Reported by <span className="font-medium">{report.reporter?.display_name}</span> (@{report.reporter?.handle})
      </p>

      {/* Reported content */}
      {isAnswer && report.answer && (
        <div className="bg-warm-50 rounded p-3 mb-2">
          <p className="text-xs text-warm-400 mb-1">
            Answer by <span className="font-medium text-warm-600">{report.answer.profiles?.display_name}</span>
            {report.answer.questions?.slug && (
              <> on <a href={`/q/${report.answer.questions.slug}`} className="underline">{report.answer.questions.body?.slice(0, 50)}...</a></>
            )}
          </p>
          <p className="text-sm text-warm-700 line-clamp-3">{report.answer.body?.slice(0, 300)}</p>
        </div>
      )}

      {isComment && report.comment && (
        <div className="bg-warm-50 rounded p-3 mb-2">
          <p className="text-xs text-warm-400 mb-1">
            Comment by <span className="font-medium text-warm-600">{report.comment.profiles?.display_name}</span>
          </p>
          <p className="text-sm text-warm-700">{report.comment.body}</p>
        </div>
      )}

      {report.details && (
        <p className="text-xs text-warm-500 italic">&ldquo;{report.details}&rdquo;</p>
      )}
    </div>
  )
}
