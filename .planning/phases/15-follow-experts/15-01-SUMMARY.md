---
phase: 15-follow-experts
plan: 01
subsystem: ui
tags: [follow, experts, directory, next.js, supabase]

requires:
  - phase: 13-follow-experts-setup
    provides: follows table, toggleFollow server action, FollowButton component
provides:
  - FollowButtonSmall component for Link-safe follow/unfollow
  - Expert directory with inline follow buttons
  - Following page expert list section
affects: [follow-experts]

tech-stack:
  added: []
  patterns: [stopPropagation pattern for client buttons inside Link wrappers]

key-files:
  created:
    - src/components/FollowButtonSmall.jsx
  modified:
    - src/app/experts/page.jsx
    - src/app/following/page.jsx

key-decisions:
  - "FollowButtonSmall uses same logic as FollowButton but with compact styling and stopPropagation"
  - "Follows query runs in parallel with existing data fetches to avoid waterfall"

patterns-established:
  - "stopPropagation pattern: client component buttons inside Next.js Link wrappers call e.stopPropagation() and e.preventDefault()"

requirements-completed: [FLLW-01, FLLW-03]

duration: 2min
completed: 2026-03-12
---

# Phase 15 Plan 01: Follow Experts from Directory Summary

**FollowButtonSmall with stopPropagation for expert directory cards, plus "Your Experts" profile list on /following page**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T18:25:25Z
- **Completed:** 2026-03-12T18:27:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Expert directory shows follow/unfollow buttons on each card for authenticated users (hidden on own card)
- /following page displays "Your Experts" section with avatar, name, headline, and profile links
- Empty-state discovery link updated from /leaderboard to /experts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FollowButtonSmall component and add to expert directory** - `53093af` (feat)
2. **Task 2: Add expert list section to /following page** - `4cfca4d` (feat)

## Files Created/Modified
- `src/components/FollowButtonSmall.jsx` - Compact follow button with stopPropagation for use inside Link wrappers
- `src/app/experts/page.jsx` - Added auth check, follows fetch, and FollowButtonSmall rendering in expert cards
- `src/app/following/page.jsx` - Added "Your Experts" profile list section and "Recent from your experts" label

## Decisions Made
- FollowButtonSmall reuses FollowButton logic with compact styling (text-xs, px-2.5 py-1) rather than a shared base component, keeping both simple
- Follows query added to existing Promise.all in experts page to avoid waterfall latency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Follow buttons work on both expert profile page (existing FollowButton) and directory (new FollowButtonSmall)
- /following page now provides both expert list and answer feed
- Ready for plan 15-02

---
*Phase: 15-follow-experts*
*Completed: 2026-03-12*
