'use client'

import { useState, useEffect, useActionState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { addComment, deleteComment } from '@/app/actions/comments'
import Avatar from '@/components/Avatar'

function CommentItem({ comment, currentUserId, answerId, onDelete, deletingId, onReply }) {
  return (
    <div className="flex gap-2">
      <Avatar src={comment.profiles?.avatar_url} alt={comment.profiles?.display_name || 'User'} size={24} className="mt-0.5" />
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
          {currentUserId && (
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-warm-400 hover:text-warm-600 transition-colors"
            >
              Reply
            </button>
          )}
          {currentUserId === comment.user_id && (
            <button
              onClick={() => onDelete(comment.id)}
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
  )
}

export default function CommentSection({ answerId, comments: initialComments = [], currentUserId }) {
  const [expanded, setExpanded] = useState(false)
  const [state, formAction, pending] = useActionState(addComment, null)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [localComments, setLocalComments] = useState(initialComments)

  useEffect(() => {
    setLocalComments(initialComments)
  }, [initialComments])

  useEffect(() => {
    if (state?.success) {
      setBody('')
      setReplyTo(null)
    }
  }, [state])

  async function handleDelete(commentId) {
    if (!confirm('Delete this comment?')) return
    const idx = localComments.findIndex(c => c.id === commentId)
    const removed = localComments[idx]
    setLocalComments(prev => prev.filter(c => c.id !== commentId))
    setDeletingId(commentId)
    const result = await deleteComment(commentId, answerId)
    if (result?.error) {
      // Revert at original position to maintain thread order
      if (removed) {
        setLocalComments(prev => {
          const next = [...prev]
          next.splice(idx, 0, removed)
          return next
        })
      }
      alert(result.error)
    }
    setDeletingId(null)
  }

  function handleReply(comment) {
    setReplyTo(comment)
    setBody(`@${comment.profiles?.display_name} `)
  }

  function cancelReply() {
    setReplyTo(null)
    setBody('')
  }

  // Build thread structure: top-level + replies grouped by parent
  const topLevel = localComments.filter(c => !c.parent_id)
  const repliesMap = {}
  for (const c of localComments) {
    if (c.parent_id) {
      if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = []
      repliesMap[c.parent_id].push(c)
    }
  }

  const count = localComments.length

  return (
    <div className="mt-3">
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
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                answerId={answerId}
                onDelete={handleDelete}
                deletingId={deletingId}
                onReply={handleReply}
              />
              {/* Replies */}
              {repliesMap[comment.id]?.map(reply => (
                <div key={reply.id} className="ml-8 mt-2">
                  <CommentItem
                    comment={reply}
                    currentUserId={currentUserId}
                    answerId={answerId}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                    onReply={handleReply}
                  />
                </div>
              ))}
            </div>
          ))}

          {/* Comment form */}
          {currentUserId ? (
            <form action={formAction} className="space-y-2">
              <input type="hidden" name="answerId" value={answerId} />
              {replyTo && <input type="hidden" name="parentId" value={replyTo.id} />}
              {replyTo && (
                <div className="flex items-center gap-2 text-xs text-warm-500">
                  <span>Replying to {replyTo.profiles?.display_name}</span>
                  <button type="button" onClick={cancelReply} className="text-warm-400 hover:text-warm-600">
                    Cancel
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  name="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
                  maxLength={2000}
                  className="flex-1 px-3 py-1.5 text-sm border border-warm-200 rounded-md text-warm-800 placeholder:text-warm-400 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
                <button
                  type="submit"
                  disabled={pending || !body.trim()}
                  className="px-3 py-1.5 text-sm font-medium bg-accent-600 text-white rounded-md hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {pending ? '...' : 'Post'}
                </button>
              </div>
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
