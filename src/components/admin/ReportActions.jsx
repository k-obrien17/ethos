'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reviewReport } from '@/app/actions/reports'
import { toggleAnswerVisibility } from '@/app/actions/answers'

export default function ReportActions({ reportId, answerId }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleAction(action) {
    startTransition(async () => {
      if (action === 'action' && answerId) {
        await toggleAnswerVisibility(answerId)
      }
      await reviewReport(reportId, action)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleAction('action')}
        disabled={isPending}
        className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? '...' : 'Hide content'}
      </button>
      <button
        onClick={() => handleAction('dismiss')}
        disabled={isPending}
        className="px-2 py-1 text-xs font-medium text-warm-600 hover:text-warm-800 disabled:opacity-50"
      >
        Dismiss
      </button>
    </div>
  )
}
