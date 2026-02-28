'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'question', label: 'Questions' },
  { value: 'answer', label: 'Answers' },
  { value: 'expert', label: 'Experts' },
]

const DATE_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: '3months', label: 'Past 3 months' },
  { value: 'year', label: 'Past year' },
]

export default function SearchFilters({ topics = [] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentType = searchParams.get('type') || ''
  const currentTopic = searchParams.get('topic') || ''
  const currentRange = searchParams.get('range') || ''

  function updateParam(key, value) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      {/* Type chips */}
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParam('type', opt.value)}
            className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-colors ${
              currentType === opt.value
                ? 'bg-warm-800 text-warm-50 border-warm-800'
                : 'bg-white text-warm-600 border-warm-300 hover:border-warm-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Topic + Date range row */}
      <div className="flex gap-3">
        <select
          value={currentTopic}
          onChange={(e) => updateParam('topic', e.target.value)}
          className="text-sm border border-warm-300 rounded-lg px-3 py-1.5 bg-white text-warm-700 focus:outline-none focus:ring-2 focus:ring-warm-400"
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={currentRange}
          onChange={(e) => updateParam('range', e.target.value)}
          className="text-sm border border-warm-300 rounded-lg px-3 py-1.5 bg-white text-warm-700 focus:outline-none focus:ring-2 focus:ring-warm-400"
        >
          {DATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
