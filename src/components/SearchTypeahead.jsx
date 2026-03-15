'use client'

import { useState, useEffect } from 'react'
import { searchSuggestions } from '@/app/actions/search'

function TypeIcon({ type }) {
  if (type === 'answer') {
    return (
      <svg className="w-4 h-4 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  }
  if (type === 'expert') {
    return (
      <svg className="w-4 h-4 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  }
  // Default: question / search icon
  return (
    <svg className="w-4 h-4 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4 text-warm-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function SearchTypeahead({ query, selectedIndex, onSelect, onClose, onClearRecent }) {
  const [suggestions, setSuggestions] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ethos_recent_searches') || '[]')
      setRecentSearches(stored.slice(0, 5)) // eslint-disable-line react-hooks/set-state-in-effect
    } catch {
      setRecentSearches([])
    }
  }, [])

  // Debounced live suggestions
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting state when query clears is a legitimate reactive pattern
      setSuggestions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      const { suggestions: results } = await searchSuggestions(query.trim())
      setSuggestions(results)
      setIsLoading(false)
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  // Show recent searches when query is empty
  const showRecent = !query || query.trim().length < 2
  const items = showRecent
    ? recentSearches.map(term => ({ id: `recent-${term}`, term, type: 'recent' }))
    : suggestions

  if (showRecent && recentSearches.length === 0) {
    return null
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-warm-200 shadow-lg overflow-hidden z-50">
      {isLoading && !showRecent && (
        <div className="px-4 py-2.5 text-sm text-warm-400">
          Searching...
        </div>
      )}

      {(!isLoading || showRecent) && items.length > 0 && (
        <ul role="listbox">
          {items.map((item, index) => (
            <li key={item.id || item.term} role="option" aria-selected={index === selectedIndex}>
              <button
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left ${
                  index === selectedIndex ? 'bg-warm-100' : 'hover:bg-warm-50'
                }`}
                onClick={() => onSelect(item)}
                onMouseDown={(e) => e.preventDefault()}
              >
                {item.type === 'recent' ? <ClockIcon /> : <TypeIcon type={item.type} />}
                <span className="truncate text-warm-800">
                  {item.type === 'recent' ? item.term : item.title}
                </span>
                {item.subtitle && (
                  <span className="ml-auto text-xs text-warm-400 shrink-0">{item.subtitle}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !showRecent && items.length === 0 && query.trim().length >= 2 && (
        <div className="px-4 py-2.5 text-sm text-warm-400">
          No suggestions found
        </div>
      )}

      {/* "See all results" footer for live suggestions */}
      {query && query.trim().length >= 2 && (
        <button
          type="button"
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-warm-500 border-t border-warm-100 text-left ${
            selectedIndex === items.length ? 'bg-warm-100' : 'hover:bg-warm-50'
          }`}
          onClick={() => onSelect({ term: query.trim() })}
          onMouseDown={(e) => e.preventDefault()}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          See all results for &ldquo;{query.trim()}&rdquo;
        </button>
      )}

      {/* Clear recent searches */}
      {showRecent && recentSearches.length > 0 && (
        <button
          type="button"
          className="w-full px-4 py-2 text-xs text-warm-400 border-t border-warm-100 hover:text-warm-600 text-left"
          onClick={() => {
            onClearRecent()
            setRecentSearches([])
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          Clear recent searches
        </button>
      )}
    </div>
  )
}
