'use client'

export default function BudgetIndicator({ used, limit }) {
  const remaining = limit - used

  if (remaining <= 0) {
    return (
      <span className="text-xs font-medium text-red-600">
        0 answers remaining
      </span>
    )
  }

  return (
    <span className="text-xs font-medium text-warm-600">
      {remaining} of {limit} remaining
    </span>
  )
}
