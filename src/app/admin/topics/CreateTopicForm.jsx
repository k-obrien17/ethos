'use client'

import { useActionState } from 'react'
import { createTopic } from '@/app/actions/topics'

export default function CreateTopicForm() {
  const [state, formAction, pending] = useActionState(createTopic, null)

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="name" className="block text-xs font-medium text-warm-600 mb-1">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={50}
          placeholder="e.g., Leadership"
          className="w-full px-3 py-2 border border-warm-200 rounded-md text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-xs font-medium text-warm-600 mb-1">
          Description <span className="text-warm-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          maxLength={200}
          placeholder="Short description of this topic"
          className="w-full px-3 py-2 border border-warm-200 rounded-md text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 resize-y"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Creating...' : 'Create Topic'}
      </button>
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
          Topic created.
        </p>
      )}
    </form>
  )
}
