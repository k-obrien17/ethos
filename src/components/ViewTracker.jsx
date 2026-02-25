'use client'

import { useEffect } from 'react'

export default function ViewTracker({ answerId }) {
  useEffect(() => {
    fetch(`/api/answers/${answerId}/view`, { method: 'POST' })
      .catch(() => {}) // fire-and-forget
  }, [answerId])

  return null
}
