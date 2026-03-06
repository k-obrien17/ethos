'use client'

import { useState, useEffect, useActionState } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { editAnswer } from '@/app/actions/answers'
import LikeButton from '@/components/LikeButton'
import CommentSection from '@/components/CommentSection'

const MARKDOWN_STYLES = "prose-answer"

export default function EditableAnswerCard({ answer, expert, monthlyUsage, currentUserId, featured = false, isLiked = false, comments = [], editWindowExpiresAt }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(answer.body)
  const [showPreview, setShowPreview] = useState(false)
  const [minutesRemaining, setMinutesRemaining] = useState(() => {
    if (!editWindowExpiresAt) return 0
    return Math.max(0, Math.ceil((editWindowExpiresAt - Date.now()) / (1000 * 60)))
  })
  const [state, formAction, pending] = useActionState(editAnswer, null)

  // Calculate if within edit window
  const isOwner = currentUserId === expert.id
  const canEdit = isOwner && minutesRemaining > 0

  // Update countdown every 30 seconds
  useEffect(() => {
    if (!isOwner || !editWindowExpiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((editWindowExpiresAt - Date.now()) / (1000 * 60)))
      setMinutesRemaining(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        setEditing(false)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOwner, editWindowExpiresAt])

  // Handle successful edit — exit edit mode
  useEffect(() => {
    if (state?.success && editing) {
      setEditing(false)
    }
  }, [state?.success, editing])

  if (editing) {
    return (
      <article className="p-6 bg-white rounded-lg border border-warm-200">
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
                <> &middot; {monthlyUsage} of {expert.answer_limit} this month</>
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

        {/* Edit form */}
        <form action={formAction}>
          <input type="hidden" name="answerId" value={answer.id} />

          {/* Write/Preview tabs */}
          <div className="border border-warm-200 rounded-lg overflow-hidden">
            <div className="flex border-b border-warm-200 bg-warm-50">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  !showPreview
                    ? 'text-warm-900 bg-white border-b-2 border-warm-800'
                    : 'text-warm-500 hover:text-warm-700'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  showPreview
                    ? 'text-warm-900 bg-white border-b-2 border-warm-800'
                    : 'text-warm-500 hover:text-warm-700'
                }`}
              >
                Preview
              </button>
            </div>

            {/* Preview area */}
            {showPreview && (
              <div className="min-h-[156px] px-3 py-2">
                {content ? (
                  <div className={MARKDOWN_STYLES}>
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-warm-400 text-sm py-2">
                    Nothing to preview yet.
                  </p>
                )}
              </div>
            )}

            {/* Textarea — always rendered for form data; sr-only when previewing */}
            <textarea
              name="body"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              {...(showPreview
                ? { className: 'sr-only', tabIndex: -1, 'aria-hidden': true }
                : {
                    rows: 6,
                    required: true,
                    minLength: 10,
                    className:
                      'w-full px-3 py-2 text-warm-900 focus:outline-none focus:ring-2 focus:ring-warm-300 resize-y border-0',
                  })}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-warm-400">
              {minutesRemaining}m remaining to edit
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setContent(answer.body); setShowPreview(false) }}
                disabled={pending}
                className="px-3 py-1.5 text-sm text-warm-600 hover:text-warm-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || content.trim().length < 10}
                className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? 'Saving...' : 'Save Edit'}
              </button>
            </div>
          </div>

          {state?.error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {state.error}
            </p>
          )}
        </form>
      </article>
    )
  }

  // Non-editing mode — same layout as AnswerCard but with edit button
  return (
    <article id={`answer-${answer.id}`} className="p-6 bg-white rounded-lg border border-warm-200">
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
              <> &middot; {monthlyUsage} of {expert.answer_limit} this month</>
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
      <div className={MARKDOWN_STYLES}>
        <ReactMarkdown>{answer.body}</ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-warm-100 text-xs text-warm-400">
        <div className="flex items-center gap-3">
          <LikeButton
            answerId={answer.id}
            likeCount={answer.like_count ?? 0}
            isLiked={isLiked}
            isAuthenticated={!!currentUserId}
          />
          <span>{answer.word_count} words</span>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-warm-500 hover:text-warm-700 font-medium"
            >
              Edit ({minutesRemaining}m left)
            </button>
          )}
          <Link href={`/answers/${answer.id}`} className="hover:text-warm-600">
            Link
          </Link>
        </div>
      </div>

      {/* Comments */}
      <CommentSection
        answerId={answer.id}
        comments={comments}
        currentUserId={currentUserId}
      />
    </article>
  )
}
