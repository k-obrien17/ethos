'use client'

import { useState, useEffect, useActionState } from 'react'
import { submitAnswer } from '@/app/actions/answers'
import BudgetIndicator from '@/components/BudgetIndicator'

export default function AnswerForm({ questionId, budgetUsed, budgetLimit, hasAnswered }) {
  const [state, formAction, pending] = useActionState(submitAnswer, null)
  const [content, setContent] = useState('')
  const draftKey = `ethos_draft_${questionId}`

  const remaining = budgetLimit - budgetUsed
  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0

  // Restore draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(draftKey)
    if (saved) setContent(saved)
  }, [draftKey])

  // Auto-save draft with 500ms debounce
  useEffect(() => {
    if (!content) {
      localStorage.removeItem(draftKey)
      return
    }
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, content)
    }, 500)
    return () => clearTimeout(timer)
  }, [content, draftKey])

  // Clear draft on successful submission
  useEffect(() => {
    if (state?.success) {
      localStorage.removeItem(draftKey)
      setContent('')
    }
  }, [state?.success, draftKey])

  // Already answered this question
  if (hasAnswered) {
    return (
      <div className="p-4 bg-warm-100 rounded-lg text-warm-600 text-sm">
        You have already answered this question.
      </div>
    )
  }

  // Budget exhausted (Layer 1: client UX enforcement)
  if (remaining <= 0) {
    return (
      <div className="p-4 bg-warm-100 rounded-lg">
        <p className="text-warm-600 text-sm">
          You have used all {budgetLimit} answers this month.
        </p>
        <p className="text-warm-500 text-xs mt-1">
          Your budget resets at the start of next month.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-warm-200 p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-warm-800">
          Your answer
        </p>
        <BudgetIndicator used={budgetUsed} limit={budgetLimit} />
      </div>

      <form action={formAction}>
        <input type="hidden" name="questionId" value={questionId} />

        <textarea
          name="body"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your perspective..."
          rows={6}
          required
          minLength={10}
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300 resize-y"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-warm-400 space-x-3">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            {content && <span>· Draft saved</span>}
          </div>

          <button
            type="submit"
            disabled={pending || content.trim().length < 10}
            className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>

        {/* Error message */}
        {state?.error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {state.error}
          </p>
        )}

        {/* Success message */}
        {state?.success && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
            Answer submitted successfully.
          </p>
        )}
      </form>

      <p className="text-xs text-warm-400 mt-3">
        Submitting uses 1 of your {budgetLimit} monthly answers. This cannot be undone.
      </p>
    </div>
  )
}
