'use client'

import { useState, useTransition } from 'react'
import { updateProfileStatus } from '@/app/actions/profile'

export default function ApprovalButton({ userId, currentStatus }) {
  const [status, setStatus] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    setStatus('approved')
    startTransition(async () => {
      const result = await updateProfileStatus(userId, 'approved')
      if (result.error) setStatus(currentStatus)
    })
  }

  function handleSuspend() {
    setStatus('suspended')
    startTransition(async () => {
      const result = await updateProfileStatus(userId, 'suspended')
      if (result.error) setStatus(currentStatus)
    })
  }

  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-600 font-medium">Approved</span>
        <button
          onClick={handleSuspend}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded-md font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Suspend
        </button>
      </div>
    )
  }

  if (status === 'suspended') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600 font-medium">Suspended</span>
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="text-xs px-2 py-1 rounded-md font-medium border border-green-200 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
        >
          Reinstate
        </button>
      </div>
    )
  }

  // pending
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        Approve
      </button>
      <button
        onClick={handleSuspend}
        disabled={isPending}
        className="text-xs px-3 py-1.5 rounded-md font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  )
}
