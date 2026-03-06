'use client'

import { useState, useTransition } from 'react'
import { toggleFollow } from '@/app/actions/follows'

export default function FollowButton({ targetUserId, isFollowing: initialFollowing }) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const prev = isFollowing
      setIsFollowing(!prev)
      const result = await toggleFollow(targetUserId)
      if (result?.error) {
        setIsFollowing(prev)
      } else if (result?.following !== undefined) {
        setIsFollowing(result.following)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'bg-warm-100 text-warm-700 hover:bg-warm-200'
          : 'bg-warm-800 text-warm-50 hover:bg-warm-900'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
