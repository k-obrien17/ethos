'use client'

import { useState, useEffect, useActionState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { addComment, deleteComment } from '@/app/actions/comments'

export default function CommentSection({ answerId, comments = [], currentUserId }) {
  const [expanded, setExpanded] = useState(false)
  const [state, formAction, pending] = useActionState(addComment, null)
  const [body, setBody] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // Clear input on success
  useEffect(() => {
    if (state?.success) setBody('')
  }, [state])

  async function handleDelete(commentId) {
    setDeletingId(commentId)
    await deleteComment(commentId, answerId)
    setDeletingId(null)
  }

  const count = comments.length

  return (
    <div className="mt-3">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-warm-400 hover:text-warm-600 transition-colors"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H6l-4 3V5z" />
        </svg>
        {count > 0 ? `${count} ${count === 1 ? 'comment' : 'comments'}` : 'Comment'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Existing comments */}
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              {comment.profiles?.avatar_url ? (
                <img
                  src={comment.profiles.avatar_url}
                  alt={comment.profiles.display_name}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-warm-200 flex items-center justify-center text-warm-500 text-xs font-medium flex-shrink-0 mt-0.5">
                  {comment.profiles?.display_name?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/expert/${comment.profiles?.handle}`}
                    className="text-xs font-medium text-warm-700 hover:underline"
                  >
                    {comment.profiles?.display_name}
                  </Link>
                  <span className="text-xs text-warm-400">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {currentUserId === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="text-xs text-warm-400 hover:text-red-500 transition-colors"
                    >
                      {deletingId === comment.id ? '...' : 'Delete'}
                    </button>
                  )}
                </div>
                <p className="text-sm text-warm-700 mt-0.5 whitespace-pre-wrap break-words">
                  {comment.body}
                </p>
              </div>
            </div>
          ))}

          {/* Add comment form */}
          {currentUserId ? (
            <form action={formAction} className="flex gap-2">
              <input type="hidden" name="answerId" value={answerId} />
              <input
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment..."
                maxLength={2000}
                className="flex-1 px-3 py-1.5 text-sm border border-warm-200 rounded-lg text-warm-800 placeholder:text-warm-400 focus:outline-none focus:ring-1 focus:ring-warm-300"
              />
              <button
                type="submit"
                disabled={pending || !body.trim()}
                className="px-3 py-1.5 text-sm font-medium bg-warm-800 text-warm-50 rounded-lg hover:bg-warm-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pending ? '...' : 'Post'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-warm-400">
              <Link href="/login" className="underline hover:text-warm-600">Sign in</Link> to comment.
            </p>
          )}

          {state?.error && (
            <p className="text-xs text-red-600">{state.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
