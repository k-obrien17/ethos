import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import LikeButton from '@/components/LikeButton'

export default function AnswerCard({ answer, expert, monthlyUsage, featured = false, isLiked = false, isAuthenticated = false }) {
  return (
    <article
      id={`answer-${answer.id}`}
      className="p-6 bg-white rounded-lg border border-warm-200"
    >
      {/* Expert info */}
      <Link href={`/expert/${expert.handle}`} className="flex items-center gap-3 mb-4 group">
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
          <p className="font-medium text-warm-900 group-hover:underline">
            {expert.display_name}
          </p>
          <p className="text-xs text-warm-500">
            {expert.display_name} chose to answer
            {monthlyUsage != null && expert.answer_limit != null && (
              <> · {monthlyUsage} of {expert.answer_limit} this month</>
            )}
          </p>
        </div>
      </Link>

      {/* Featured badge */}
      {featured && (
        <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-amber-700">
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 1l2.39 6.34H19l-5.3 3.85L15.3 18 10 13.82 4.7 18l1.61-6.81L1 7.34h6.61L10 1z" />
          </svg>
          Featured
        </div>
      )}

      {/* Answer body — Markdown rendered */}
      <div className="prose-answer">
        <ReactMarkdown>{answer.body}</ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-warm-100 text-xs text-warm-400">
        <div className="flex items-center gap-3">
          <LikeButton
            answerId={answer.id}
            likeCount={answer.like_count ?? 0}
            isLiked={isLiked}
            isAuthenticated={isAuthenticated}
          />
          <span>{answer.word_count} words</span>
        </div>
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
