'use client'

import Link from 'next/link'

export default function QuestionError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-bold text-warm-900 mb-2">We couldn't load this content</h2>
      <p className="text-warm-500 text-sm mb-6 max-w-md">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors"
      >
        Try again
      </button>
      <Link href="/" className="mt-3 text-sm text-accent-600 hover:text-accent-700">
        Go home
      </Link>
    </div>
  )
}
