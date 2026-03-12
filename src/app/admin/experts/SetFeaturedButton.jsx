'use client'

import { useState, useTransition } from 'react'
import { setFeaturedExpert, clearFeaturedExpert } from '@/app/actions/settings'

export default function SetFeaturedButton({ expertId, isFeatured }) {
  const [featured, setFeatured] = useState(isFeatured)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const wasFeatured = featured
    setFeatured(!wasFeatured)

    startTransition(async () => {
      const result = wasFeatured
        ? await clearFeaturedExpert()
        : await setFeaturedExpert(expertId)

      if (result.error) {
        setFeatured(wasFeatured)
      }
    })
  }

  if (featured) {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors bg-accent-100 text-accent-700 border border-accent-200 hover:bg-accent-200 disabled:opacity-50 flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1l2.39 6.34H19l-5.3 3.85L15.3 18 10 13.82 4.7 18l1.61-6.81L1 7.34h6.61L10 1z" />
        </svg>
        Featured
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors border border-warm-300 text-warm-600 hover:bg-warm-50 disabled:opacity-50"
    >
      Feature
    </button>
  )
}
