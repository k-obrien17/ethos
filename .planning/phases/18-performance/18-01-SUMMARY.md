---
phase: 18-performance
plan: 01
subsystem: ui
tags: [next-image, avatar, performance, cls, webp]

requires: []
provides:
  - "Reusable Avatar component wrapping next/image with fallback initials"
  - "next.config.mjs remotePatterns for Google and LinkedIn avatar domains"
  - "Zero CLS from avatar images via explicit width/height"
affects: [19-ux-polish]

tech-stack:
  added: [next/image]
  patterns: [Avatar component for all avatar rendering]

key-files:
  created:
    - src/components/Avatar.jsx
  modified:
    - next.config.mjs
    - src/components/AnswerCard.jsx
    - src/components/CommentSection.jsx
    - src/app/page.jsx
    - src/app/expert/[handle]/page.jsx
    - src/app/experts/page.jsx
    - src/app/answers/[id]/page.jsx
    - src/app/trending/page.jsx
    - src/app/leaderboard/page.jsx
    - src/app/following/page.jsx
    - src/app/dashboard/page.jsx
    - src/app/admin/experts/page.jsx

key-decisions:
  - "Used inline style for fallback div dimensions instead of Tailwind to support arbitrary size prop values"
  - "Avatar component works in both server and client components (no 'use client' directive)"

patterns-established:
  - "Avatar pattern: always use <Avatar src= alt= size= /> for avatar rendering"

requirements-completed: [PERF-01, PERF-02]

duration: 4min
completed: 2026-03-14
---

# Phase 18 Plan 01: Avatar Image Optimization Summary

**Reusable Avatar component wrapping next/image with fallback initials, replacing 12 raw img tags across 11 files for automatic WebP/AVIF optimization and zero CLS**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T15:31:58Z
- **Completed:** 2026-03-14T15:36:10Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Created Avatar component with next/image, configurable size prop, and initial-letter fallback
- Configured next.config.mjs remotePatterns for Google (lh3.googleusercontent.com) and LinkedIn (media.licdn.com, *.licdn.com) avatar domains
- Replaced all 12 raw `<img>` avatar instances across 11 files with the Avatar component
- npm run build passes with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Avatar component and configure next/image domains** - `4ecbd37` (feat)
2. **Task 2: Replace all raw img avatar tags with Avatar component** - `f8a983e` (feat)

## Files Created/Modified
- `src/components/Avatar.jsx` - Reusable avatar component wrapping next/image with fallback
- `next.config.mjs` - Added remotePatterns for Google and LinkedIn avatar domains
- `src/components/AnswerCard.jsx` - Replaced 36px avatar with Avatar component
- `src/components/CommentSection.jsx` - Replaced 24px avatar with Avatar component
- `src/app/page.jsx` - Replaced 32px (trending) and 56px (featured expert) avatars
- `src/app/expert/[handle]/page.jsx` - Replaced 64px profile avatar
- `src/app/experts/page.jsx` - Replaced 40px directory listing avatars
- `src/app/answers/[id]/page.jsx` - Replaced 32px other perspectives avatars
- `src/app/trending/page.jsx` - Replaced 24px trending avatars
- `src/app/leaderboard/page.jsx` - Replaced 40px leaderboard avatars
- `src/app/following/page.jsx` - Replaced 32px followed expert avatars
- `src/app/dashboard/page.jsx` - Replaced 64px dashboard profile avatar
- `src/app/admin/experts/page.jsx` - Replaced 32px admin expert list avatars

## Decisions Made
- Used inline `style={{ width, height }}` for fallback div instead of Tailwind classes to support arbitrary size values via prop
- Avatar component has no `'use client'` directive since next/image works in server components; it also works when consumed by client components
- Featured expert avatar on homepage was w-14 h-14 (56px), not 48px as noted in plan -- used correct 56px

## Deviations from Plan

None - plan executed exactly as written (minor size correction for featured expert: plan noted 48px but actual markup was w-14 h-14 = 56px).

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All avatars use next/image optimization pipeline
- Avatar component established as the standard pattern for future avatar rendering
- Ready for Phase 18 Plan 02 and Phase 19 (UX Polish)

---
*Phase: 18-performance*
*Completed: 2026-03-14*

## Self-Check: PASSED
