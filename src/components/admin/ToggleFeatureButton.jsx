'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFeaturedAnswer } from '@/app/actions/answers'

export default function ToggleFeatureButton({ answerId, isFeatured }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleToggle() {
    setPending(true)
    const result = await toggleFeaturedAnswer(answerId)
    if (result?.error) {
      alert(result.error)
    } else {
      router.refresh()
    }
    setPending(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`text-xs px-2 py-1 rounded ${
        isFeatured
          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'bg-warm-50 text-warm-600 hover:bg-warm-100'
      } disabled:opacity-50`}
    >
      {pending ? '...' : isFeatured ? 'Unfeature' : 'Feature'}
    </button>
  )
}
