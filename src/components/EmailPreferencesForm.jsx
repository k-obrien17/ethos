'use client'

import { useActionState } from 'react'
import { updateEmailPreferences } from '@/app/actions/profile'

const NOTIFICATION_TYPES = [
  { key: 'comments', label: 'Comments on your answers', description: 'When someone comments on one of your answers' },
  { key: 'comment_replies', label: 'Replies to your comments', description: 'When someone replies to a comment you posted' },
  { key: 'follows', label: 'New followers', description: 'When someone starts following you' },
  { key: 'followed_expert_posts', label: 'Followed expert posts', description: 'When an expert you follow posts a new answer' },
  { key: 'featured', label: 'Featured answers', description: 'When your answer is selected as an editorial pick' },
]

const EMAIL_ONLY_TYPES = [
  { key: 'daily_question', label: 'Daily question', description: "Each morning's question with a link to answer" },
  { key: 'weekly_recap', label: 'Weekly recap', description: "Monday summary of the week's questions and top answers" },
  { key: 'budget_reset', label: 'Budget reset', description: 'Notification when your monthly answer budget resets' },
  { key: 'bookmark_live', label: 'Bookmark alerts', description: 'When a question you saved goes live and is ready to answer' },
]

export default function EmailPreferencesForm({ preferences }) {
  const [state, formAction, pending] = useActionState(updateEmailPreferences, null)

  return (
    <form action={formAction} className="space-y-6">
      {/* Activity Notifications — in-app + email toggles */}
      <div>
        <h3 className="text-sm font-semibold text-warm-900 mb-3">Activity Notifications</h3>
        <div className="space-y-3">
          {/* Header row */}
          <div className="flex items-center gap-3">
            <div className="flex-1" />
            <span className="text-xs font-medium text-warm-500 w-14 text-center">In-app</span>
            <span className="text-xs font-medium text-warm-500 w-14 text-center">Email</span>
          </div>
          {NOTIFICATION_TYPES.map(({ key, label, description }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warm-900">{label}</p>
                <p className="text-xs text-warm-500">{description}</p>
              </div>
              <div className="w-14 flex justify-center">
                <input
                  type="checkbox"
                  name={`${key}_inapp`}
                  defaultChecked={preferences?.[`${key}_inapp`] !== false}
                  className="rounded border-warm-300 text-accent-600 focus:ring-accent-500"
                />
              </div>
              <div className="w-14 flex justify-center">
                <input
                  type="checkbox"
                  name={`${key}_email`}
                  defaultChecked={preferences?.[`${key}_email`] === true}
                  className="rounded border-warm-300 text-accent-600 focus:ring-accent-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Emails — email-only */}
      <div>
        <h3 className="text-sm font-semibold text-warm-900 mb-3">Content Emails</h3>
        <div className="space-y-3">
          {EMAIL_ONLY_TYPES.map(({ key, label, description }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name={key}
                defaultChecked={preferences?.[key] !== false}
                className="mt-1 rounded border-warm-300 text-accent-600 focus:ring-accent-500"
              />
              <div>
                <p className="text-sm font-medium text-warm-900">{label}</p>
                <p className="text-xs text-warm-500">{description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 disabled:opacity-50 transition-colors"
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
