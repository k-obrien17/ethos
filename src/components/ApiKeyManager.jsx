'use client'

import { useState, useActionState, useTransition } from 'react'
import { createApiKey, revokeApiKey } from '@/app/actions/apiKeys'
import { format } from 'date-fns'

export default function ApiKeyManager({ keys }) {
  const [state, formAction, pending] = useActionState(createApiKey, null)
  const [revokingId, setRevokingId] = useState(null)
  const [, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const activeKeys = keys.filter(k => !k.revoked_at)
  const revokedKeys = keys.filter(k => k.revoked_at)

  function handleRevoke(keyId) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    setRevokingId(keyId)
    startTransition(async () => {
      await revokeApiKey(keyId)
      setRevokingId(null)
    })
  }

  function copyKey() {
    if (state?.key) {
      navigator.clipboard.writeText(state.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create new key */}
      <section className="bg-white border border-warm-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-warm-900 mb-3">Create API Key</h2>
        <form action={formAction} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-warm-500 mb-1">Key name</label>
            <input
              type="text"
              name="name"
              placeholder="e.g. My website"
              maxLength={50}
              required
              className="w-full px-3 py-2 border border-warm-200 rounded-md text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 disabled:opacity-50 transition-colors"
          >
            {pending ? 'Creating...' : 'Create'}
          </button>
        </form>

        {state?.error && <p className="text-sm text-red-600 mt-2">{state.error}</p>}

        {state?.key && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800 mb-1">
              Copy your key now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-white px-2 py-1 rounded border border-amber-200 flex-1 truncate">
                {state.key}
              </code>
              <button
                onClick={copyKey}
                className="text-xs text-amber-700 hover:text-amber-900 font-medium flex-shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Active keys */}
      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Active Keys ({activeKeys.length})
        </h2>
        {activeKeys.length > 0 ? (
          <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
            {activeKeys.map(key => (
              <div key={key.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-warm-900">{key.name}</p>
                  <p className="text-xs text-warm-400 font-mono">{key.key_prefix}...</p>
                  <p className="text-xs text-warm-400 mt-0.5">
                    Created {format(new Date(key.created_at), 'MMM d, yyyy')}
                    {key.last_used_at && ` · Last used ${format(new Date(key.last_used_at), 'MMM d')}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  disabled={revokingId === key.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {revokingId === key.id ? '...' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-warm-500">No active API keys.</p>
        )}
      </section>

      {revokedKeys.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
            Revoked ({revokedKeys.length})
          </h2>
          <div className="bg-warm-50 border border-warm-200 rounded-lg divide-y divide-warm-100">
            {revokedKeys.map(key => (
              <div key={key.id} className="px-4 py-3 flex items-center justify-between opacity-50">
                <div>
                  <p className="text-sm text-warm-700 line-through">{key.name}</p>
                  <p className="text-xs text-warm-400 font-mono">{key.key_prefix}...</p>
                </div>
                <span className="text-xs text-warm-400">Revoked</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
