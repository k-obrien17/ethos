'use client'

function percentChange(current, previous) {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return 'new'
  if (current === 0) return -100
  return Math.round(((current - previous) / previous) * 100)
}

function ChangeBadge({ change }) {
  if (change === null) {
    return <span className="text-xs font-medium text-warm-400">—</span>
  }
  if (change === 'new') {
    return (
      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
        New
      </span>
    )
  }
  const isPositive = change > 0
  const isNegative = change < 0
  const color = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-warm-500'
  const bg = isPositive ? 'bg-green-50' : isNegative ? 'bg-red-50' : 'bg-warm-100'
  return (
    <span className={`text-xs font-medium ${color} ${bg} px-1.5 py-0.5 rounded`}>
      {isPositive ? '+' : ''}{change}%
    </span>
  )
}

export default function GrowthChart({ title, metrics }) {
  return (
    <div className="bg-white border border-warm-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-4">
        {title}
      </h3>
      <div className="space-y-4">
        {metrics.map(({ label, current, previous, unit }) => {
          const change = percentChange(current, previous)
          const maxVal = Math.max(current, previous, 1)
          const currentWidth = (current / maxVal) * 100
          const previousWidth = (previous / maxVal) * 100
          const barColor = change === null || change === 0
            ? 'bg-warm-400'
            : change === 'new' || change > 0
              ? 'bg-green-500'
              : 'bg-red-400'

          return (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-warm-700">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-warm-500">
                    {previous}{unit ?? ''} → {current}{unit ?? ''}
                  </span>
                  <ChangeBadge change={change} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-warm-400 w-12 shrink-0">Previous</span>
                  <div className="flex-1 bg-warm-100 rounded-full h-3">
                    <div
                      className="bg-warm-200 h-3 rounded-full transition-all"
                      style={{ width: `${previousWidth}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-warm-400 w-12 shrink-0">Current</span>
                  <div className="flex-1 bg-warm-100 rounded-full h-3">
                    <div
                      className={`${barColor} h-3 rounded-full transition-all`}
                      style={{ width: `${currentWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
