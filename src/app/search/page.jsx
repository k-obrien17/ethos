import { createClient } from '@/lib/supabase/server'
import { getCachedTopics } from '@/lib/supabase/cached'
import Link from 'next/link'
import { searchContent } from '@/app/actions/search'
import SearchResultCard from '@/components/SearchResultCard'
import SearchFilters from './SearchFilters'
import { Suspense } from 'react'

export const revalidate = 300

export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const q = params.q
  if (q) return { title: `Search: ${q}`, alternates: { canonical: '/search' } }
  return { title: 'Search', alternates: { canonical: '/search' } }
}

function buildSearchUrl(baseParams, overrides) {
  const params = new URLSearchParams()
  const merged = { ...baseParams, ...overrides }
  if (merged.q) params.set('q', merged.q)
  if (merged.type) params.set('type', merged.type)
  if (merged.topic) params.set('topic', merged.topic)
  if (merged.range) params.set('range', merged.range)
  if (merged.page && merged.page > 1) params.set('page', String(merged.page))
  return `/search?${params.toString()}`
}

export default async function SearchPage({ searchParams }) {
  const params = await searchParams
  const query = params.q || ''
  const type = params.type || null
  const topicId = params.topic || null
  const dateRange = params.range || null
  const page = parseInt(params.page) || 1

  // Fetch search results if query present and >= 2 chars
  const { results, hasMore, error } = query.length >= 2
    ? await searchContent({ query, type, topicId, dateRange, page })
    : { results: [], hasMore: false, error: null }

  // Fetch all topics for filter dropdown (cached)
  const topics = await getCachedTopics()

  const supabase = await createClient()

  // Fetch trending topics for no-results state
  let trendingTopics = []
  if (query && results.length === 0 && !error) {
    const { data } = await supabase
      .from('topics')
      .select('*, question_topics(count)')
      .order('name')
      .limit(6)
    trendingTopics = (data ?? [])
      .map((t) => ({ ...t, questionCount: t.question_topics?.[0]?.count ?? 0 }))
      .sort((a, b) => b.questionCount - a.questionCount)
  }

  const currentParams = { q: query, type, topic: topicId, range: dateRange, page }

  return (
    <div>
      {/* Search input form */}
      <form action="/search" className="mb-6">
        <div className="relative">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search questions, answers, experts..."
            className="w-full px-4 py-3 pr-10 rounded-lg border border-warm-300 bg-white text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-400 focus:border-transparent"
            autoFocus={!query}
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      </form>

      {/* Header */}
      {query ? (
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-warm-900">
            Results for &quot;{query}&quot;
          </h1>
          {results.length > 0 && (
            <p className="text-warm-500 text-sm mt-1">
              {results.length}{hasMore ? '+' : ''} result{results.length !== 1 ? 's' : ''}
              {page > 1 ? ` (page ${page})` : ''}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-warm-900 mb-2">Search</h1>
          <p className="text-warm-500">
            Search for questions, answers, and experts
          </p>
        </div>
      )}

      {/* Filters (only show when there's a query) */}
      {query && (
        <div className="mb-6">
          <Suspense fallback={null}>
            <SearchFilters topics={topics ?? []} />
          </Suspense>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => (
            <SearchResultCard key={`${result.result_type}-${result.result_id}`} result={result} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(hasMore || page > 1) && (
        <div className="flex items-center justify-between mt-6">
          {page > 1 ? (
            <Link
              href={buildSearchUrl(currentParams, { page: page - 1 })}
              className="text-sm font-medium text-warm-600 hover:text-warm-800"
            >
              Previous page
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link
              href={buildSearchUrl(currentParams, { page: page + 1 })}
              className="text-sm font-medium text-warm-600 hover:text-warm-800"
            >
              Next page
            </Link>
          )}
        </div>
      )}

      {/* No results state */}
      {query && query.length >= 2 && results.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-warm-600 mb-2">
            No results for &quot;{query}&quot;
          </p>
          <p className="text-warm-500 text-sm mb-6">
            Try different keywords or browse by topic
          </p>
          {trendingTopics.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {trendingTopics.map((t) => (
                <Link
                  key={t.id}
                  href={`/topics/${t.slug}`}
                  className="text-sm px-3 py-1.5 rounded-full bg-warm-100 text-warm-600 font-medium hover:bg-warm-200 transition-colors"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Short query warning */}
      {query && query.length < 2 && (
        <div className="text-center py-8">
          <p className="text-warm-500 text-sm">
            Please enter at least 2 characters to search.
          </p>
        </div>
      )}
    </div>
  )
}
