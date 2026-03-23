'use client'

import { useEffect } from 'react'

export default function ViewTracker({ answerId }) {
  useEffect(() => {
    fetch(`/api/answers/${answerId}/view`, { method: 'POST' })
      .catch(err => console.warn('[view-track]', err.message))
  }, [answerId])

  return null
}
