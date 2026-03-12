---
phase: 12-content-surfacing
plan: 02
subsystem: ui
tags: [supabase, react, related-content, answer-page]

requires:
  - phase: 12-content-surfacing
    provides: Existing answer page structure with expert profile and question context joins
provides:
  - "More from this expert" related content section on answer pages
  - "Other perspectives on this question" related content section on answer pages
  - Content discovery loops between answers and expert profiles
affects: [expert-directory]

tech-stack:
  added: []
  patterns: [parallel related-content queries, inline markdown stripping]

key-files:
  created: []
  modified:
    - src/app/answers/[id]/page.jsx

key-decisions:
  - "Merged like check with related content queries into single Promise.all for parallel execution"
  - "Compact card layout with inline markdown stripping instead of full AnswerCard for related items"

patterns-established:
  - "Related content pattern: parallel neq queries for same-expert and same-question answers"

requirements-completed: [SURF-03]

duration: 1min
completed: 2026-03-11
---

# Phase 12 Plan 02: Answer Page Related Content Summary

**Two related content sections on answer pages — "More from this expert" and "Other perspectives" — creating content discovery loops**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-11T14:02:18Z
- **Completed:** 2026-03-11T14:03:18Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Answer pages now show up to 3 other answers by the same expert
- Answer pages show up to 4 other answers to the same question from different experts
- Both queries run in parallel with existing data fetches for zero additional latency
- Sections gracefully hidden when no related content exists

## Task Commits

Each task was committed atomically:

1. **Task 1: Add related content sections to answer page** - `86ec960` (feat)

## Files Created/Modified
- `src/app/answers/[id]/page.jsx` - Added parallel queries for expert answers and question perspectives, rendered as compact card sections

## Decisions Made
- Merged like status check with related content queries into a single Promise.all for efficiency
- Used inline markdown stripping (regex) instead of importing ReactMarkdown for excerpts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 12 complete with all content surfacing features shipped
- Ready for Phase 13: Expert Directory

---
*Phase: 12-content-surfacing*
*Completed: 2026-03-11*
