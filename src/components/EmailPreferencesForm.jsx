'use client'

import { useActionState } from 'react'
import { updateEmailPreferences } from '@/app/actions/profile'

const EMAIL_TYPES = [
  { key: 'daily_question', label: 'Daily question', description: "Each morning's question with a link to answer" },
  { key: 'weekly_recap', label: 'Weekly recap', description: "Monday summary of the week's questions and top answers" },
  { key: 'budget_reset', label: 'Budget reset', description: 'Notification when your monthly answer budget resets' },
  { key: 'featured_answer', label: 'Featured answer', description: 'When your answer is picked as an editorial feature' },
]

export default function EmailPreferencesForm({ preferences }) {
  const [state, formAction, pending] = useActionState(updateEmailPreferences, null)

  return (
    <form action={formAction} className="space-y-4">
      {EMAIL_TYPES.map(({ key, label, description }) => (
        <label key={key} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name={key}
            defaultChecked={preferences?.[key] !== false}
            className="mt-1 rounded border-warm-300 text-warm-800 focus:ring-warm-500"
          />
          <div>
            <p className="text-sm font-medium text-warm-900">{label}</p>
            <p className="text-xs text-warm-500">{description}</p>
          </div>
        </label>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving...' : 'Save Preferences'}
        </button>
        {state?.success && (
          <span className="text-sm text-green-600">Preferences saved.</span>
        )}
        {state?.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  )
}
