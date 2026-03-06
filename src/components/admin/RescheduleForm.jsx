'use client'

import { useActionState } from 'react'
import { rescheduleQuestion } from '@/app/actions/questions'

export default function RescheduleForm({ questionId, currentDate }) {
  const [state, formAction, pending] = useActionState(rescheduleQuestion, null)

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="question_id" value={questionId} />
      <input
        type="date"
        name="publish_date"
        defaultValue={currentDate ?? ''}
        required
        className="text-xs px-2 py-1 border border-warm-200 rounded bg-white text-warm-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-xs px-2 py-1 bg-accent-600 text-white rounded font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? '...' : 'Set'}
      </button>
      {state?.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
      {state?.success && (
        <span className="text-xs text-green-600">Saved</span>
      )}
    </form>
  )
}
