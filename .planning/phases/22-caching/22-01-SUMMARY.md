---
phase: 22-caching
plan: 01
subsystem: infra
tags: [isr, cache-control, next.js, vercel, cdn]

requires:
  - phase: 21-deploy
    provides: Vercel deployment pipeline
provides:
  - ISR revalidation on legal and leaderboard pages
  - Cache-Control headers for static assets and favicon
affects: [22-caching]

tech-stack:
  added: []
  patterns: [ISR revalidate exports, next.config.mjs headers function]

key-files:
  created: []
  modified:
    - src/app/privacy/page.jsx
    - src/app/terms/page.jsx
    - src/app/leaderboard/page.jsx
    - next.config.mjs

key-decisions:
  - "Leaderboard revalidation changed from 300s to 3600s (hourly) since data changes slowly"
  - "No /public font headers needed -- next/font/google already serves from /_next/static with immutable hashes"

patterns-established:
  - "ISR revalidation: export const revalidate = N at top of page files"
  - "Cache headers: async headers() in next.config.mjs for static asset caching"

requirements-completed: [CACH-01, CACH-04]

duration: 1min
completed: 2026-03-17
---

# Phase 22 Plan 01: ISR & Static Asset Caching Summary

**Daily ISR on legal pages, hourly ISR on leaderboard, and immutable cache headers for static assets via next.config.mjs**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-17T20:44:23Z
- **Completed:** 2026-03-17T20:45:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Privacy and terms pages now use daily ISR (revalidate = 86400) for edge caching without redeploys
- Leaderboard page updated from 5-minute to hourly ISR (revalidate = 3600)
- Static assets and favicon served with explicit Cache-Control headers from CDN

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ISR revalidation to legal and leaderboard pages** - `07d5f69` (feat)
2. **Task 2: Add cache headers for static assets in next.config.mjs** - `0abe415` (feat)

## Files Created/Modified
- `src/app/privacy/page.jsx` - Added revalidate = 86400 export for daily ISR
- `src/app/terms/page.jsx` - Added revalidate = 86400 export for daily ISR
- `src/app/leaderboard/page.jsx` - Changed revalidate from 300 to 3600 (hourly ISR)
- `next.config.mjs` - Added async headers() with Cache-Control for static assets and favicon

## Decisions Made
- Leaderboard revalidation increased from 5 minutes to 1 hour since leaderboard data changes slowly
- No /public font directory headers needed since next/font/google serves fonts from /_next/static with content-hashed immutable URLs
- Favicon gets shorter cache (1 day fresh + 1 week stale) since it may change with branding updates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ISR and cache headers ready for Vercel deployment
- Plan 22-02 can proceed with client-side caching strategies

---
*Phase: 22-caching*
*Completed: 2026-03-17*
