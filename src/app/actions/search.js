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

export async function searchSuggestions(query) {
  if (!query || query.trim().length < 2) {
    return { suggestions: [] }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_content', {
    search_query: query.trim(),
    filter_type: null,
    filter_topic_id: null,
    filter_date_range: null,
    result_limit: 7,
    result_offset: 0,
  })

  if (error) {
    return { suggestions: [] }
  }

  const suggestions = (data ?? []).map(r => ({
    id: r.result_id,
    type: r.result_type,
    title: r.title,
    url: r.url,
    subtitle: r.result_type === 'answer' ? r.author_name :
              r.result_type === 'expert' ? `@${r.author_handle}` : null,
  }))

  return { suggestions }
}
