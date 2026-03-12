---
phase: 12-content-surfacing
plan: 01
subsystem: ui
tags: [supabase, react, date-fns, trending, questions]

requires:
  - phase: 10-topic-taxonomy
    provides: Topic pills and question_topics join for enriched question display
provides:
  - Trending answers section on homepage ranked by engagement
  - Enhanced question archive with answer counts and engagement indicators
  - /questions/[slug] redirect to canonical /q/[slug] URL
affects: [expert-directory, discovery]

tech-stack:
  added: []
  patterns: [client-side engagement scoring, weighted sort]

key-files:
  created:
    - src/app/questions/[slug]/page.jsx
  modified:
    - src/app/page.jsx
    - src/app/questions/page.jsx

key-decisions:
  - "Client-side weighted scoring (view_count + like_count*2) instead of custom RPC — simpler, avoids Supabase computed ORDER BY limitation"
  - "/questions/[slug] redirects to /q/[slug] instead of duplicating the question detail page"

patterns-established:
  - "plainExcerpt helper: strip markdown chars and truncate for compact card previews"
  - "Engagement enrichment: query answer view_count in aggregate for parent entity stats"

requirements-completed: [SURF-01, SURF-02]

duration: 2min
completed: 2026-03-11
---

# Phase 12 Plan 01: Trending Section + Question Archive Summary

**Homepage trending section with weighted engagement scoring and enriched question archive with view counts, popularity badges, and slug redirect**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-11T14:00:43Z
- **Completed:** 2026-03-11T14:02:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Homepage shows "Trending This Week" section with top 5 answers ranked by engagement score
- Questions archive enriched with total view counts and "Popular" badge for high-engagement questions
- /questions/[slug] redirects to canonical /q/[slug] for URL consistency

## Task Commits

Each task was committed atomically:

1. **Task 1: Trending section on homepage** - `8c762d7` (feat)
2. **Task 2: Question archive with answer detail pages** - `592c1e0` (feat)

## Files Created/Modified
- `src/app/page.jsx` - Added trending answers section with parallel Supabase query and weighted scoring
- `src/app/questions/page.jsx` - Enhanced with engagement stats, Popular badge, updated metadata
- `src/app/questions/[slug]/page.jsx` - Redirect to canonical /q/[slug] URL

## Decisions Made
- Used client-side weighted scoring (view_count + like_count*2) instead of custom RPC for simplicity
- /questions/[slug] redirects to /q/[slug] rather than duplicating the detail page

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Trending content and question archive complete, ready for Phase 12 Plan 02 (related content)
- All engagement queries added to existing parallel fetch blocks for efficiency

---
*Phase: 12-content-surfacing*
*Completed: 2026-03-11*
