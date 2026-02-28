'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTopic } from '@/app/actions/topics'

export default function DeleteTopicButton({ topicId, topicName }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete topic "${topicName}"? This will remove it from all questions.`)) return

    setPending(true)
    const result = await deleteTopic(topicId)
    if (result?.error) {
      alert(result.error)
      setPending(false)
    } else {
      router.refresh()
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
