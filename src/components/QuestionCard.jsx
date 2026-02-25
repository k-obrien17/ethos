import Link from 'next/link'
import { format } from 'date-fns'

export default function QuestionCard({ question, answerCount }) {
  return (
    <Link
      href={`/q/${question.slug}`}
      className="block p-6 bg-white rounded-lg border border-warm-200 hover:border-warm-400 transition-colors"
    >
      {question.category && (
        <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
          {question.category}
        </span>
      )}
      <h2 className="text-lg font-semibold text-warm-900 mt-1">
        {question.body}
      </h2>
      <div className="flex items-center gap-3 mt-3 text-sm text-warm-500">
        <span>{format(new Date(question.publish_date), 'MMM d, yyyy')}</span>
        <span>·</span>
        <span>
          {answerCount} {answerCount === 1 ? 'answer' : 'answers'}
        </span>
      </div>
    </Link>
  )
}
