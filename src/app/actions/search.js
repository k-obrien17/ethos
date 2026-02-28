'use server'

import { createClient } from '@/lib/supabase/server'

export async function searchContent({ query, type, topicId, dateRange, page = 1 }) {
  if (!query || query.trim().length < 2) {
    return { results: [], hasMore: false, error: null }
  }

  const supabase = await createClient()
  const limit = 20
  const offset = (page - 1) * limit

  const { data, error } = await supabase.rpc('search_content', {
    search_query: query.trim(),
    filter_type: type || null,
    filter_topic_id: topicId || null,
    filter_date_range: dateRange || null,
    result_limit: limit + 1,
    result_offset: offset,
  })

  if (error) {
    console.error('[search] RPC error:', error)
    return { results: [], hasMore: false, error: 'Search failed. Please try again.' }
  }

  const hasMore = (data ?? []).length > limit
  const results = (data ?? []).slice(0, limit)

  return { results, hasMore, error: null }
}
