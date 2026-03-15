'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import { submitAnswer } from '@/app/actions/answers'
import BudgetIndicator from '@/components/BudgetIndicator'
import { saveDraft } from '@/app/actions/drafts'

const MARKDOWN_STYLES = "prose-answer"

export default function AnswerForm({ questionId, budgetUsed, budgetLimit, hasAnswered, serverDraft }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(submitAnswer, null)
  const [content, setContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const draftKey = `ethos_draft_${questionId}`
  const submittedRef = useRef(false)

  const remaining = budgetLimit - budgetUsed
  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0

  // Restore draft from server or localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(draftKey)
    if (saved) {
      setContent(saved) // eslint-disable-line react-hooks/set-state-in-effect
    } else if (serverDraft) {
      setContent(serverDraft)
    }
  }, [draftKey, serverDraft])

  // Auto-save draft with 500ms debounce (localStorage) + 3s debounce (server)
  // Skip saves after successful submission to prevent stale draft recreation
  useEffect(() => {
    if (!content || submittedRef.current) {
      if (!content) localStorage.removeItem(draftKey)
      return
    }
    const localTimer = setTimeout(() => {
      if (!submittedRef.current) localStorage.setItem(draftKey, content)
    }, 500)
    const serverTimer = setTimeout(() => {
      if (!submittedRef.current) saveDraft(questionId, content)
    }, 3000)
    return () => { clearTimeout(localTimer); clearTimeout(serverTimer) }
  }, [content, draftKey, questionId])

  // Clear draft on successful submission or AI rejection
  useEffect(() => {
    if (state?.success || state?.aiRejected) {
      submittedRef.current = true
      localStorage.removeItem(draftKey)
      setContent('') // eslint-disable-line react-hooks/set-state-in-effect
    }
    if (state?.aiRejected) {
      toast.error('Answer flagged as AI-generated')
    }
    if (state?.error && !state?.aiRejected) {
      toast.error('Failed to save answer')
    }
    // Refresh server data so new answer appears instantly
    if (state?.success) {
      toast.success('Answer saved')
      router.refresh()
      // Scroll to new answer after refresh
      if (state.answerId) {
        setTimeout(() => {
          document.getElementById(`answer-${state.answerId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 500)
      }
    }
  }, [state?.success, state?.aiRejected, state?.error, draftKey, router, state?.answerId])

  // Already answered this question
  if (hasAnswered) {
    return (
      <div className="py-4 text-warm-500 text-sm">
        You have already answered this question.
      </div>
    )
  }

  // Budget exhausted (Layer 1: client UX enforcement)
  if (remaining <= 0) {
    return (
      <div className="py-4">
        <p className="text-warm-500 text-sm">
          You have used all {budgetLimit} answers this month.
        </p>
        <p className="text-warm-400 text-xs mt-1">
          Your budget resets at the start of next month.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-warm-200 rounded-md p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-warm-800">
          Your answer
        </p>
        <BudgetIndicator used={budgetUsed} limit={budgetLimit} />
      </div>

      <form action={formAction}>
        <input type="hidden" name="questionId" value={questionId} />

        <div className="border border-warm-200 rounded-md overflow-hidden">
          {/* Write / Preview tabs */}
          <div className="flex border-b border-warm-200 bg-warm-50">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                !showPreview
                  ? 'text-warm-900 bg-white border-b-2 border-accent-600'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                showPreview
                  ? 'text-warm-900 bg-white border-b-2 border-accent-600'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Preview area */}
          {showPreview && (
            <div className="min-h-[156px] px-3 py-2">
              {content ? (
                <div className={MARKDOWN_STYLES}>
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-warm-400 text-sm py-2">
                  Nothing to preview yet.
                </p>
              )}
            </div>
          )}

          {/* Textarea — always rendered for form data; sr-only when previewing */}
          <textarea
            name="body"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            {...(showPreview
              ? { className: 'sr-only', tabIndex: -1, 'aria-hidden': true }
              : {
                  placeholder: 'Share your perspective... (Markdown supported)',
                  rows: 6,
                  required: true,
                  minLength: 10,
                  className:
                    'w-full px-3 py-2 text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500 resize-y border-0',
                })}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-warm-400 space-x-3">
            <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            {content && <span>&middot; Draft saved</span>}
          </div>

          <button
            type="submit"
            disabled={pending || content.trim().length < 10}
            className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>

        {/* AI rejection message */}
        {state?.aiRejected && (
          <div className="mt-3 text-sm bg-red-50 border border-red-200 px-4 py-3 rounded-md">
            <p className="font-semibold text-red-800">AI-generated content detected</p>
            <p className="text-red-700 mt-1">
              Ethos is a human-only platform. Your answer was flagged as AI-written and cannot be published. Rewrite it in your own words and try again.
            </p>
          </div>
        )}

        {/* Error message */}
        {state?.error && !state?.aiRejected && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
            {state.error}
          </p>
        )}

        {/* Success message */}
        {state?.success && (
          <p className="mt-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
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
