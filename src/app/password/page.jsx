'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-bold text-warm-900 mb-2">Ethos</h1>
      <p className="text-warm-500 text-sm mb-6">Enter the password to continue</p>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false) }}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-3 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-500"
        />
        {error && <p className="text-red-600 text-sm">Incorrect password.</p>}
        <button
          type="submit"
          className="w-full px-4 py-3 bg-warm-800 text-warm-50 rounded-lg font-medium hover:bg-warm-900 transition-colors"
        >
          Enter
        </button>
      </form>
    </div>
  )
}
