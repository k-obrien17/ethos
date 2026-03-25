'use client'

import { useState } from 'react'
import { createExpertInvite } from '@/app/actions/invites'
import { toast } from 'sonner'

export default function ExpertInvites({ invites = [], maxInvites = 2 }) {
  const [codes, setCodes] = useState(invites)
  const [loading, setLoading] = useState(false)

  const remaining = maxInvites - codes.length

  async function handleCreate() {
    setLoading(true)
    const result = await createExpertInvite()
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.code) {
      setCodes(prev => [...prev, { code: result.code, claimed_at: null }])
      toast.success('Invite code created!')
    }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    toast.success('Copied to clipboard!')
  }

  if (maxInvites === 0) return null

  return (
    <div className="bg-white rounded-lg border border-warm-200 p-4">
      <h3 className="text-sm font-semibold text-warm-800 mb-2">Invite a Colleague</h3>
      <p className="text-xs text-warm-500 mb-3">
        Share Ethos with someone who has something worth saying. You get {maxInvites} invite{maxInvites !== 1 ? 's' : ''}.
      </p>

      {codes.length > 0 && (
        <div className="space-y-2 mb-3">
          {codes.map((inv, i) => (
            <div key={i} className="flex items-center justify-between bg-warm-50 rounded px-3 py-2">
              <code className="text-sm font-mono font-bold text-warm-900">{inv.code}</code>
              <div className="flex items-center gap-2">
                {inv.claimed_at ? (
                  <span className="text-xs text-warm-400">Claimed</span>
                ) : (
                  <button
                    onClick={() => copyCode(inv.code)}
                    className="text-xs text-accent-600 hover:text-accent-700 font-medium"
                  >
                    Copy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          onClick={handleCreate}
          disabled={loading}
          className="text-sm px-3 py-1.5 bg-accent-600 text-white rounded-md font-medium hover:bg-accent-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating...' : `Generate Invite (${remaining} left)`}
        </button>
      )}
    </div>
  )
}
