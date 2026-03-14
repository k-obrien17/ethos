'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { toggleFollow } from '@/app/actions/follows'

export default function FollowButton({ targetUserId, isFollowing: initialFollowing, displayName }) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const prev = isFollowing
      setIsFollowing(!prev)
      const result = await toggleFollow(targetUserId)
      if (result?.error) {
        setIsFollowing(prev)
        toast.error('Failed to update follow')
      } else if (result?.following !== undefined) {
        setIsFollowing(result.following)
        const name = displayName || 'user'
        toast.success(result.following ? `Following ${name}` : `Unfollowed ${name}`)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
        isFollowing
          ? 'bg-warm-100 text-warm-700 hover:bg-warm-200'
          : 'bg-accent-600 text-white hover:bg-accent-700'
      }`}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
