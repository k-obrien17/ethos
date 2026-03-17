---
phase: 22-caching
plan: 02
subsystem: infra
tags: [next-cache, unstable_cache, supabase, caching, suspense]

requires:
  - phase: 18-loading-states
    provides: loading.jsx Suspense boundaries for all dynamic routes
provides:
  - Cached Supabase query helpers (getCachedTopics, getCachedSiteSettings)
  - Reduced redundant Supabase calls for topics and site settings
affects: [admin, topics, settings]

tech-stack:
  added: []
  patterns: [unstable_cache wrapper for non-cookie Supabase queries via admin client]

key-files:
  created:
    - src/lib/supabase/cached.js
  modified:
    - src/app/page.jsx
    - src/app/experts/page.jsx
    - src/app/search/page.jsx

key-decisions:
  - "Used admin client (service role) for cached queries to avoid cookie dependency"
  - "Topics page left unchanged — needs question_topics(count) and topic_follows(count) not in cached shape"
  - "CACH-02 confirmed satisfied by existing loading.jsx files from Phase 18"

patterns-established:
  - "unstable_cache wrapper pattern: import admin client inside callback, return data ?? [] fallback"
  - "Cache tags for targeted revalidation: 'topics' and 'site-settings'"

requirements-completed: [CACH-02, CACH-03]

duration: 2min
completed: 2026-03-17
---

# Phase 22 Plan 02: Cached Supabase Queries Summary

**unstable_cache wrappers for topics and site settings queries with 5-minute revalidation via admin client**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T20:46:45Z
- **Completed:** 2026-03-17T20:48:51Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created cached query module with getCachedTopics and getCachedSiteSettings using unstable_cache
- Homepage now uses cached site settings for featured expert instead of inline Supabase query
- Experts and search pages use cached topic list for filter dropdowns
- Confirmed CACH-02 (Suspense boundaries) already satisfied by 11 existing loading.jsx files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cached Supabase query module** - `b07b87a` (feat)
2. **Task 2: Replace inline queries with cached helpers on key pages** - `860f3ff` (feat)

## Files Created/Modified
- `src/lib/supabase/cached.js` - Cached query helpers using unstable_cache (getCachedTopics, getCachedSiteSettings)
- `src/app/page.jsx` - Homepage uses getCachedSiteSettings for featured_expert_id
- `src/app/experts/page.jsx` - Expert directory uses getCachedTopics for topic filter
- `src/app/search/page.jsx` - Search page uses getCachedTopics for filter dropdown

## Decisions Made
- Used admin client (createAdminClient from @supabase/supabase-js) for cached queries since unstable_cache cannot use cookies
- Topics page (topics/page.jsx) left unchanged because it needs question_topics(count) and topic_follows(count) which differ from the cached shape (id, name, slug only)
- CACH-02 confirmed satisfied without code changes — 11 loading.jsx files already provide route-level Suspense boundaries

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 22 (Caching) is now complete with both ISR/static caching (plan 01) and query-level caching (plan 02)
- Ready for Phase 23 if applicable

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 22-caching*
*Completed: 2026-03-17*
