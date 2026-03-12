---
phase: 13-expert-directory
plan: 01
subsystem: ui
tags: [next.js, supabase, server-components, topic-expertise]

requires:
  - phase: 10-topic-taxonomy-browse
    provides: topics table, question_topics junction
  - phase: 12-content-surfacing
    provides: trending answers, content discovery patterns
provides:
  - /experts directory page with sort, filter, and topic expertise tags
  - Expert profile expertise section with derived topic tags
  - Nav link to experts page
affects: [13-expert-directory]

tech-stack:
  added: []
  patterns: [topic-expertise-derivation-via-question_topics, url-driven-sort-filter]

key-files:
  created: [src/app/experts/page.jsx]
  modified: [src/app/expert/[handle]/page.jsx, src/components/Header.jsx, src/components/MobileNav.jsx]

key-decisions:
  - "Topic expertise derived from answers -> question_topics -> topics aggregation, counted per topic, top N selected"
  - "Sort/filter controls rendered as server-side Link elements with URL params, no client component needed"
  - "Directory shows top 3 expertise tags per expert; profile shows top 5"

patterns-established:
  - "Expertise derivation: answers.question_id -> question_topics -> topics, count per topic per expert"
  - "URL-driven sort/filter with Link-based controls for server components"

requirements-completed: [EXPR-01, EXPR-02]

duration: 4min
completed: 2026-03-11
---

# Plan 13-01: Expert Directory Summary

**Browsable /experts directory with sort by answers/selectivity/recent/likes, topic filter, and auto-generated expertise tags on cards and profile pages**

## Performance

- **Duration:** 4 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- /experts page aggregates all expert stats (answer count, selectivity, likes) and derives topic expertise from question_topics junction
- Sort by 4 criteria and filter by topic, all URL-driven with server-side Link controls
- Expert profile page shows Expertise section with top 5 derived topic tags and answer counts
- OG metadata includes expertise topics for social sharing
- Experts link added to desktop and mobile nav

## Task Commits

1. **Task 1: Expert directory page** - `bf6f18a` (feat)
2. **Task 2: Expert profile expertise tags** - `8161574` (feat)

## Files Created/Modified
- `src/app/experts/page.jsx` - Expert directory with sort/filter/expertise cards
- `src/app/expert/[handle]/page.jsx` - Added expertise section + OG metadata
- `src/components/Header.jsx` - Added Experts nav link
- `src/components/MobileNav.jsx` - Added Experts mobile nav link

## Decisions Made
- Expertise tags derived via answers -> question_topics -> topics join, aggregated in JS (same pattern as leaderboard statsMap)
- Directory cards show top 3 topics; profile shows top 5 for more detail
- Sort/filter implemented as server-side Link elements to avoid client components

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## Next Phase Readiness
- Expert directory complete, ready for featured expert spotlight (13-02)

---
*Phase: 13-expert-directory*
*Completed: 2026-03-11*
