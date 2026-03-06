import Link from 'next/link'
import { format } from 'date-fns'

export default function QuestionCard({ question, answerCount }) {
  const topics = question.question_topics?.map((qt) => qt.topics).filter(Boolean) ?? []

  return (
    <div className="py-4">
      <Link
        href={`/q/${question.slug}`}
        className="block group outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded-sm"
      >
        <h2 className="text-base font-semibold text-warm-900 group-hover:text-accent-600 transition-colors leading-snug">
          {question.body}
        </h2>
        <div className="flex items-center gap-2 mt-1.5 text-sm text-warm-400">
          <span>{format(new Date(question.publish_date), 'MMM d, yyyy')}</span>
          <span>&middot;</span>
          <span>
            {answerCount} {answerCount === 1 ? 'perspective' : 'perspectives'}
          </span>
        </div>
      </Link>
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={`/topics/${topic.slug}`}
              className="text-xs px-2 py-0.5 rounded-md bg-warm-100 text-warm-500 font-medium hover:bg-warm-200 hover:text-warm-600 transition-colors"
            >
              {topic.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
