'use client'

import { useState, useTransition } from 'react'
import { sendVerificationEmail } from '@/app/actions/profile'

export default function VerifyEmailBanner() {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  function handleSend() {
    startTransition(async () => {
      const result = await sendVerificationEmail()
      if (result?.error) {
        setError(result.error)
      } else {
        setSent(true)
      }
    })
  }

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
        Verification email sent. Check your inbox.
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-900">Verify your email</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Email verification is required before you can submit answers.
          </p>
        </div>
        <button
          onClick={handleSend}
          disabled={isPending}
          className="px-3 py-1.5 bg-amber-700 text-white rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {isPending ? 'Sending...' : 'Send verification'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
