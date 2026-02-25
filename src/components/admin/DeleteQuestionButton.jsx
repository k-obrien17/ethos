'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteQuestion } from '@/app/actions/questions'

export default function DeleteQuestionButton({ questionId, questionBody }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    const preview = questionBody.length > 60
      ? questionBody.slice(0, 60) + '...'
      : questionBody
    if (!confirm(`Delete "${preview}"?`)) return

    setPending(true)
    const result = await deleteQuestion(questionId)
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
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
