'use client'

export default function GlobalError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-xl font-bold text-warm-900 mb-2">Something went wrong</h2>
      <p className="text-warm-500 text-sm mb-6 max-w-md">
        {error?.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
