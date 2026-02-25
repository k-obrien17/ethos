'use client'

import { useState } from 'react'

export default function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-warm-400 hover:text-warm-600"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
