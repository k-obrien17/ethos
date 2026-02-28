---
phase: 11-search
plan: 01
subsystem: database, api, ui
tags: [postgres, full-text-search, tsvector, tsquery, gin-index, rpc, next.js, server-actions]

# Dependency graph
requires:
  - phase: 10-topics
    provides: topics table and question_topics junction for topic-based filtering
provides:
  - Postgres full-text search indexes (tsvector) on questions, answers, and profiles
  - search_content RPC function for unified multi-table search
  - /search results page with type, topic, and date range filters
  - SearchResultCard component for displaying search results
  - SearchFilters client component for interactive filter controls
affects: [11-02-search-bar, 12-content-surfacing, 13-expert-directory]

# Tech tracking
tech-stack:
  added: [websearch_to_tsquery, ts_headline, tsvector/GIN]
  patterns: [Postgres RPC for complex multi-table queries, URL-driven filter state]

key-files:
  created:
    - supabase/migrations/00013_search_indexes.sql
    - src/app/actions/search.js
    - src/app/search/page.jsx
    - src/app/search/SearchFilters.jsx
    - src/components/SearchResultCard.jsx
  modified:
    - src/app/globals.css

key-decisions:
  - "Used websearch_to_tsquery for Google-like search syntax (quoted phrases, AND, OR, -exclude)"
  - "Unified search_content RPC returns interleaved results ranked by ts_rank across all three content types"
  - "Filter state fully URL-driven for shareability and browser back/forward support"
  - "SearchFilters extracted as client component for interactive dropdown/chip controls while page remains server component"

patterns-established:
  - "Postgres RPC pattern: complex multi-table queries via supabase.rpc() rather than chained .from() queries"
  - "URL-param-driven filtering: server page reads searchParams, client component updates URL via router.push"
  - "dangerouslySetInnerHTML for ts_headline <mark> snippets (safe because Postgres generates the markup)"

requirements-completed: [SRCH-01, SRCH-02]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 11 Plan 01: Search Infrastructure Summary

**Postgres full-text search with tsvector/GIN indexes, unified search_content RPC, and /search results page with type/topic/date filters**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T14:48:07Z
- **Completed:** 2026-02-28T14:51:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Postgres full-text search infrastructure: tsvector columns, GIN indexes, auto-update triggers, and backfill for questions, answers, and profiles
- Unified search_content RPC function with weighted ranking, type/topic/date filters, and highlighted snippets
- /search results page with search input, type chips, topic dropdown, date range dropdown, pagination, and no-results trending topics

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Postgres full-text search migration** - `c4232be` (feat)
2. **Task 2: Search results page with filters and result cards** - `e4734d8` (feat)

**Plan metadata:** (pending) (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/00013_search_indexes.sql` - tsvector columns, GIN indexes, triggers, backfill, search_content RPC
- `src/app/actions/search.js` - Server action wrapping search_content RPC with pagination
- `src/app/search/page.jsx` - Search results page with URL-driven filters and result rendering
- `src/app/search/SearchFilters.jsx` - Client component for type chips, topic dropdown, date range
- `src/components/SearchResultCard.jsx` - Result card with type badge, highlighted snippet, metadata
- `src/app/globals.css` - Added mark tag styling for search highlight snippets

## Decisions Made
- Used `websearch_to_tsquery` for Google-like search syntax support (quoted phrases, negation)
- Weighted search vectors: question body (A), category (B); profile name/handle (A), headline/org (B), bio (C)
- SECURITY DEFINER on RPC with empty search_path for safe execution context
- Filter state entirely URL-driven (no React state) for shareability and SSR compatibility
- SearchFilters as separate client component to keep page as server component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Suspense boundary around SearchFilters**
- **Found during:** Task 2
- **Issue:** useSearchParams in client component requires Suspense boundary in Next.js 14+
- **Fix:** Wrapped SearchFilters in `<Suspense fallback={null}>` in the search page
- **Files modified:** src/app/search/page.jsx
- **Verification:** Build passes successfully
- **Committed in:** e4734d8

**2. [Rule 2 - Missing Critical] Added short-query warning state**
- **Found during:** Task 2
- **Issue:** User entering 1 character sees no results and no explanation; added helpful minimum-length warning
- **Fix:** Added conditional rendering for query.length < 2 with explanatory text
- **Files modified:** src/app/search/page.jsx
- **Verification:** Build passes, UI displays warning for short queries
- **Committed in:** e4734d8

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both auto-fixes improve UX and framework compliance. No scope creep.

## Issues Encountered
None

## User Setup Required
Migration `00013_search_indexes.sql` must be applied to the Supabase database before search will function. Run via `supabase db push` or apply manually in the Supabase SQL editor.

## Next Phase Readiness
- Search infrastructure complete, ready for plan 11-02 (search bar + typeahead in Header)
- /search page is functional and can be linked from the header search bar
- SearchResultCard is reusable for any future search-like features

---
*Phase: 11-search*
*Completed: 2026-02-28*
