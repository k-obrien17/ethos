'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/app/actions/profile'

export default function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setPending(true)
    const result = await deleteAccount()
    if (result?.error) {
      alert(result.error)
      setPending(false)
      setConfirming(false)
    } else {
      await supabase.auth.signOut()
      router.push('/')
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-500 hover:text-red-700"
      >
        Delete my account
      </button>
    )
  }

  return (
    <div role="alertdialog" aria-labelledby="delete-confirm-title" className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <p id="delete-confirm-title" className="text-sm text-red-800 font-medium">
        Are you sure? This will permanently delete your profile and all your answers.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleDelete}
          disabled={pending}
          aria-label="Delete your account"
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? 'Deleting...' : 'Yes, delete my account'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="px-3 py-1.5 text-sm text-warm-600 hover:text-warm-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
