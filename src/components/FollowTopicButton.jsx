'use client'

import { useState, useTransition } from 'react'
import { followTopic, unfollowTopic } from '@/app/actions/topics'

export default function FollowTopicButton({ topicId, isFollowed, size = 'default' }) {
  const [following, setFollowing] = useState(isFollowed)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const wasFollowing = following
    // Optimistic update
    setFollowing(!wasFollowing)

    startTransition(async () => {
      const result = wasFollowing
        ? await unfollowTopic(topicId)
        : await followTopic(topicId)

      if (result.error) {
        // Revert on failure
        setFollowing(wasFollowing)
      }
    })
  }

  const sizeClasses = size === 'small'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1.5'

  if (following) {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`${sizeClasses} rounded-full font-medium transition-colors bg-warm-100 text-warm-600 border border-warm-200 hover:bg-warm-200 disabled:opacity-50 whitespace-nowrap`}
      >
        Following
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`${sizeClasses} rounded-full font-medium transition-colors border border-warm-300 text-warm-700 hover:bg-warm-50 disabled:opacity-50 whitespace-nowrap`}
    >
      Follow
    </button>
  )
}
