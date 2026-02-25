'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAnswerVisibility } from '@/app/actions/answers'

export default function ToggleHideButton({ answerId, isHidden }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleToggle() {
    setPending(true)
    const result = await toggleAnswerVisibility(answerId)
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
        isHidden
          ? 'bg-green-50 text-green-700 hover:bg-green-100'
          : 'bg-red-50 text-red-700 hover:bg-red-100'
      } disabled:opacity-50`}
    >
      {pending ? '...' : isHidden ? 'Unhide' : 'Hide'}
    </button>
  )
}
