'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { toggleLike } from '@/app/actions/likes'

export default function LikeButton({ answerId, likeCount, isLiked, isAuthenticated }) {
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(
    { count: likeCount, liked: isLiked },
    (state) => ({
      count: state.liked ? state.count - 1 : state.count + 1,
      liked: !state.liked,
    })
  )

  function handleClick() {
    if (!isAuthenticated) return
    startTransition(async () => {
      setOptimistic(optimistic)
      const result = await toggleLike(answerId)
      if (result?.error) {
        // Revert optimistic state on failure
        setOptimistic({ count: likeCount, liked: isLiked })
        toast.error('Failed to update like')
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isAuthenticated || isPending}
      className={`flex items-center gap-1 text-xs transition-colors ${
        optimistic.liked
          ? 'text-red-500'
          : isAuthenticated
            ? 'text-warm-400 hover:text-red-400'
            : 'text-warm-300 cursor-default'
      }`}
      title={isAuthenticated ? (optimistic.liked ? 'Unlike' : 'Like') : 'Sign in to like'}
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill={optimistic.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
      </svg>
      {optimistic.count > 0 && (
        <span>{optimistic.count}</span>
      )}
    </button>
  )
}
