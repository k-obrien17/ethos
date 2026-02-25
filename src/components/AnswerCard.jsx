import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

export default function AnswerCard({ answer, expert, monthlyUsage }) {
  return (
    <article
      id={`answer-${answer.id}`}
      className="p-6 bg-white rounded-lg border border-warm-200"
    >
      {/* Expert info */}
      <div className="flex items-center gap-3 mb-4">
        {expert.avatar_url ? (
          <img
            src={expert.avatar_url}
            alt={expert.display_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-warm-200 flex items-center justify-center text-warm-600 font-medium text-sm">
            {expert.display_name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium text-warm-900">
            {expert.display_name}
          </p>
          <p className="text-xs text-warm-500">
            {expert.display_name} chose to answer
            {monthlyUsage != null && expert.answer_limit != null && (
              <> · {monthlyUsage} of {expert.answer_limit} this month</>
            )}
          </p>
        </div>
      </div>

      {/* Answer body — Markdown rendered */}
      <div className="text-warm-800 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:text-warm-700 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mb-1">
        <ReactMarkdown>{answer.body}</ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-warm-100 text-xs text-warm-400">
        <span>{answer.word_count} words</span>
        <Link
          href={`/answers/${answer.id}`}
          className="hover:text-warm-600"
        >
          Link
        </Link>
      </div>
    </article>
  )
}
