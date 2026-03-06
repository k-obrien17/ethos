'use client'

import { useActionState, useState } from 'react'
import { createInvite } from '@/app/actions/invites'

export default function InviteGenerator() {
  const [state, formAction, pending] = useActionState(createInvite, null)
  const [copied, setCopied] = useState(false)

  function copyAll() {
    if (state?.codes) {
      navigator.clipboard.writeText(state.codes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="bg-white border border-warm-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide">
        Generate Invites
      </h2>
      <form action={formAction} className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-warm-500 mb-1">Count</label>
          <input
            type="number"
            name="count"
            defaultValue={5}
            min={1}
            max={20}
            className="w-20 px-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-warm-500 mb-1">Expires in (days)</label>
          <input
            type="number"
            name="expiresInDays"
            defaultValue={30}
            min={1}
            max={365}
            className="w-24 px-3 py-2 border border-warm-200 rounded-lg text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Generating...' : 'Generate'}
        </button>
      </form>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {state?.codes && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-600 font-medium">
              {state.codes.length} code{state.codes.length !== 1 ? 's' : ''} generated
            </p>
            <button
              onClick={copyAll}
              className="text-xs text-warm-600 hover:text-warm-900"
            >
              {copied ? 'Copied!' : 'Copy all'}
            </button>
          </div>
          <div className="bg-warm-50 rounded-lg p-3 font-mono text-sm space-y-1">
            {state.codes.map(code => (
              <div key={code}>{code}</div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
