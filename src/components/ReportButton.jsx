'use client'

import { useState, useActionState } from 'react'
import { submitReport } from '@/app/actions/reports'

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'ai_generated', label: 'AI-generated content' },
  { value: 'off_topic', label: 'Off-topic' },
  { value: 'other', label: 'Other' },
]

export default function ReportButton({ answerId, commentId }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(submitReport, null)

  if (state?.success) {
    return (
      <span className="text-xs text-warm-400">Reported</span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-warm-400 hover:text-red-500 transition-colors"
        title="Report"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-6 z-20 bg-white border border-warm-200 rounded-lg shadow-lg p-4 w-64">
            <form action={formAction} className="space-y-3">
              {answerId && <input type="hidden" name="answerId" value={answerId} />}
              {commentId && <input type="hidden" name="commentId" value={commentId} />}

              <p className="text-sm font-medium text-warm-900">Report content</p>

              <div className="space-y-1">
                {REASONS.map(r => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="reason" value={r.value} required className="text-warm-800" />
                    <span className="text-sm text-warm-700">{r.label}</span>
                  </label>
                ))}
              </div>

              <textarea
                name="details"
                placeholder="Additional details (optional)"
                rows={2}
                maxLength={500}
                className="w-full px-2 py-1.5 text-sm border border-warm-200 rounded text-warm-800 placeholder:text-warm-400 focus:outline-none focus:ring-1 focus:ring-warm-300"
              />

              {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm text-warm-600 hover:text-warm-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {pending ? 'Sending...' : 'Report'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
