'use client'

import { useState, useEffect, useActionState } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { editAnswer } from '@/app/actions/answers'
import LikeButton from '@/components/LikeButton'
import CommentSection from '@/components/CommentSection'
import ShareButton from '@/components/ShareButton'
import ReportButton from '@/components/ReportButton'
import Avatar from '@/components/Avatar'

export default function AnswerCard({
  answer,
  expert,
  monthlyUsage = null,
  featured = false,
  isLiked = false,
  isAuthenticated = false,
  comments = [],
  currentUserId = null,
  editWindowExpiresAt,
}) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(answer.body)
  const [showPreview, setShowPreview] = useState(false)
  const [minutesRemaining, setMinutesRemaining] = useState(() => {
    if (!editWindowExpiresAt) return 0
    return Math.max(0, Math.ceil((editWindowExpiresAt - Date.now()) / (1000 * 60)))
  })
  const [state, formAction, pending] = useActionState(editAnswer, null)

  const isOwner = currentUserId && expert?.id && currentUserId === expert.id
  const canEdit = isOwner && minutesRemaining > 0

  // Update countdown every 30 seconds
  useEffect(() => {
    if (!isOwner || !editWindowExpiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((editWindowExpiresAt - Date.now()) / (1000 * 60)))
      setMinutesRemaining(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        // Don't auto-close editing — let user submit and get server-side error
        // so they can copy their edited text before losing it
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOwner, editWindowExpiresAt])

  // Handle edit result — exit on success, preserve content on error
  useEffect(() => {
    if (state?.success && editing) {
      setEditing(false) // eslint-disable-line react-hooks/set-state-in-effect
    }
    // If edit window closed while editing, show error but keep content so user can copy it
    if (state?.error && editing) {
      // Don't auto-close — let user see the error and copy their text
    }
  }, [state?.success, state?.error, editing])

  // --- Shared header (null-safe for deleted profiles) ---
  const displayName = expert?.display_name ?? 'Unknown Expert'
  const handle = expert?.handle
  const avatarUrl = expert?.avatar_url

  const headerContent = (
    <>
      <Avatar src={avatarUrl} alt={displayName} size={36} />
      <div>
        <p className="text-sm font-medium text-warm-900 group-hover:text-accent-600 transition-colors">
          {displayName}
        </p>
        {monthlyUsage != null && expert?.answer_limit != null && (
          <p className="text-xs text-warm-400">
            {monthlyUsage} of {expert.answer_limit} this month
          </p>
        )}
      </div>
    </>
  )

  const expertHeader = handle ? (
    <Link href={`/expert/${handle}`} className="flex items-center gap-3 mb-4 group">
      {headerContent}
    </Link>
  ) : (
    <div className="flex items-center gap-3 mb-4">
      {headerContent}
    </div>
  )

  const featuredBadge = featured && (
    <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-accent-600">
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 1l2.39 6.34H19l-5.3 3.85L15.3 18 10 13.82 4.7 18l1.61-6.81L1 7.34h6.61L10 1z" />
      </svg>
      Featured
    </div>
  )

  // --- Edit mode ---
  if (editing) {
    return (
      <article className="py-6">
        {expertHeader}
        {featuredBadge}

        <form action={formAction}>
          <input type="hidden" name="answerId" value={answer.id} />

          <div className="border border-warm-200 rounded-md overflow-hidden">
            <div className="flex border-b border-warm-200 bg-warm-50">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  !showPreview
                    ? 'text-warm-900 bg-white border-b-2 border-accent-600'
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
                    ? 'text-warm-900 bg-white border-b-2 border-accent-600'
                    : 'text-warm-500 hover:text-warm-700'
                }`}
              >
                Preview
              </button>
            </div>

            {showPreview && (
              <div className="min-h-[156px] px-3 py-2">
                {content ? (
                  <div className="prose-answer">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-warm-400 text-sm py-2">
                    Nothing to preview yet.
                  </p>
                )}
              </div>
            )}

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
                      'w-full px-3 py-2 text-warm-900 focus:outline-none focus:ring-2 focus:ring-accent-500 resize-y border-0',
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
                className="px-3 py-1.5 text-sm text-warm-500 hover:text-warm-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || content.trim().length < 10}
                className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? 'Saving...' : 'Save Edit'}
              </button>
            </div>
          </div>

          {state?.error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {state.error}
            </p>
          )}
        </form>
      </article>
    )
  }

  // --- Read mode ---
  return (
    <article id={`answer-${answer.id}`} className="py-6">
      {expertHeader}
      {featuredBadge}

      <div className="prose-answer">
        <ReactMarkdown>{answer.body}</ReactMarkdown>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 text-xs text-warm-400">
        <div className="flex items-center gap-3">
          <LikeButton
            answerId={answer.id}
            likeCount={answer.like_count ?? 0}
            isLiked={isLiked}
            isAuthenticated={isAuthenticated || !!currentUserId}
          />
          <span>{answer.word_count} words</span>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="text-warm-400 hover:text-warm-700 font-medium"
            >
              Edit ({minutesRemaining}m)
            </button>
          )}
          <ShareButton url={`/answers/${answer.id}`} title={`${expert?.display_name ?? 'Expert'} on Ethos`} />
          {currentUserId && !isOwner && <ReportButton answerId={answer.id} />}
          <Link href={`/answers/${answer.id}`} className="hover:text-warm-600">
            Link
          </Link>
        </div>
      </div>

      <CommentSection
        answerId={answer.id}
        comments={comments}
        currentUserId={currentUserId}
      />
    </article>
  )
}
