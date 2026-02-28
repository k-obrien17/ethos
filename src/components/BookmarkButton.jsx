'use client'

import { useTransition, useOptimistic } from 'react'
import { toggleBookmark } from '@/app/actions/bookmarks'

export default function BookmarkButton({ questionId, isBookmarked, className = '' }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticBookmarked, setOptimisticBookmarked] = useOptimistic(isBookmarked)

  function handleClick() {
    startTransition(async () => {
      setOptimisticBookmarked(!optimisticBookmarked)
      await toggleBookmark(questionId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1 text-sm transition-colors ${
        optimisticBookmarked
          ? 'text-amber-600 hover:text-amber-700'
          : 'text-warm-400 hover:text-warm-600'
      } disabled:opacity-50 ${className}`}
      aria-label={optimisticBookmarked ? 'Remove bookmark' : 'Save for later'}
      title={optimisticBookmarked ? 'Remove bookmark' : 'Save for later'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={optimisticBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        className="w-5 h-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
        />
      </svg>
      {optimisticBookmarked ? 'Saved' : 'Save'}
    </button>
  )
}
