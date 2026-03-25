'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SearchTypeahead from '@/components/SearchTypeahead'

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem('credo_recent_searches') || '[]').slice(0, 5)
  } catch {
    return []
  }
}

function saveRecentSearch(term) {
  const recent = getRecentSearches().filter(s => s !== term)
  recent.unshift(term)
  localStorage.setItem('credo_recent_searches', JSON.stringify(recent.slice(0, 5)))
}

function clearRecentSearches() {
  localStorage.removeItem('credo_recent_searches')
}

export default function SearchBar() {
  const router = useRouter()
  const inputRef = useRef(null)
  const mobileInputRef = useRef(null)
  const containerRef = useRef(null)
  const mobileContainerRef = useRef(null)

  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Count total items for keyboard nav bounds
  useEffect(() => {
    const hasQuery = query.trim().length >= 2
    if (hasQuery) {
      // suggestions count is dynamic, but "See all results" is always +1
      // We approximate; the typeahead manages its own list
    }
  }, [query])

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsFocused(true)
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Click outside to close
  useEffect(() => {
    function handleMouseDown(e) {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        mobileContainerRef.current && !mobileContainerRef.current.contains(e.target)
      ) {
        setIsFocused(false)
      }
      if (mobileContainerRef.current && !mobileContainerRef.current.contains(e.target)) {
        if (isExpanded) {
          setIsExpanded(false)
          setQuery('')
          setIsFocused(false)
        }
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isExpanded])

  function handleSelect(item) {
    if (item.url) {
      router.push(item.url)
    } else if (item.term) {
      saveRecentSearch(item.term)
      router.push(`/search?q=${encodeURIComponent(item.term)}`)
    }
    setIsFocused(false)
    setIsExpanded(false)
    setQuery('')
    setSelectedIndex(-1)
  }

  function handleSubmit(e) {
    e.preventDefault()
    // If an item is selected, let the typeahead handle it
    // We pass selectedIndex to typeahead; on Enter, navigate to selected or search
    if (query.trim().length >= 2) {
      saveRecentSearch(query.trim())
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
    setIsFocused(false)
    setIsExpanded(false)
    inputRef.current?.blur()
    mobileInputRef.current?.blur()
  }

  function handleKeyDown(e) {
    if (!isFocused && !isExpanded) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => prev + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Escape') {
      setIsFocused(false)
      setIsExpanded(false)
      inputRef.current?.blur()
      mobileInputRef.current?.blur()
    }
  }

  return (
    <>
      {/* Desktop search bar */}
      <form onSubmit={handleSubmit} className="relative hidden sm:block" ref={containerRef}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1) }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-48 lg:w-64 px-3 py-1.5 pl-8 text-sm rounded-md border border-warm-200 bg-white text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
        />
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-warm-400 pointer-events-none hidden lg:inline">
          Cmd+K
        </span>

        {isFocused && (
          <SearchTypeahead
            query={query}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            onClose={() => setIsFocused(false)}
            onClearRecent={clearRecentSearches}
          />
        )}
      </form>

      {/* Mobile search (magnifying glass that expands) */}
      <div className="sm:hidden" ref={mobileContainerRef}>
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true)
              setIsFocused(true)
              setTimeout(() => mobileInputRef.current?.focus(), 50)
            }}
            className="text-warm-600 hover:text-warm-900 p-1"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="fixed inset-x-0 top-0 bg-white px-4 py-3 z-50 flex items-center gap-2 border-b border-warm-200"
          >
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1) }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="flex-1 px-3 py-1.5 text-sm rounded-md border border-warm-200 bg-white text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false)
                setQuery('')
                setIsFocused(false)
                setSelectedIndex(-1)
              }}
              className="text-warm-500 hover:text-warm-700 text-sm font-medium shrink-0"
            >
              Cancel
            </button>
            {isFocused && (
              <div className="absolute top-full left-0 right-0">
                <SearchTypeahead
                  query={query}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelect}
                  onClose={() => { setIsExpanded(false); setIsFocused(false) }}
                  onClearRecent={clearRecentSearches}
                />
              </div>
            )}
          </form>
        )}
      </div>
    </>
  )
}
