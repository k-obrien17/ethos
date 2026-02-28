import Link from 'next/link'
import { format } from 'date-fns'

export default function QuestionCard({ question, answerCount }) {
  const topics = question.question_topics?.map((qt) => qt.topics).filter(Boolean) ?? []

  return (
    <Link
      href={`/q/${question.slug}`}
      className="block p-6 bg-white rounded-lg border border-warm-200 hover:border-warm-400 focus-visible:ring-2 focus-visible:ring-warm-400 focus-visible:ring-offset-2 transition-colors outline-none"
    >
      {question.category && (
        <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
          {question.category}
        </span>
      )}
      <h2 className="text-lg font-semibold text-warm-900 mt-1">
        {question.body}
      </h2>
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {topics.map((topic) => (
            <span
              key={topic.slug}
              className="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-600 font-medium"
            >
              {topic.name}
            </span>
          ))}
        </div>
      )}
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
