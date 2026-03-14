---
phase: 17-seo
plan: 01
subsystem: seo
tags: [next.js, metadata, canonical-urls, robots.txt, seo]

# Dependency graph
requires: []
provides:
  - Unique meta titles and descriptions on all public pages
  - Canonical URL support via layout default + per-page alternates
  - robots.txt blocking admin/dashboard/api/auth paths
affects: [17-02 (structured data and sitemap build on this metadata foundation)]

# Tech tracking
tech-stack:
  added: []
  patterns: [Next.js metadata API with layout-level alternates.canonical default, login layout.jsx for client component metadata]

key-files:
  created:
    - src/app/login/layout.jsx
  modified:
    - src/app/layout.jsx
    - src/app/page.jsx
    - src/app/login/page.jsx
    - src/app/q/[slug]/page.jsx
    - src/app/answers/[id]/page.jsx
    - src/app/expert/[handle]/page.jsx
    - src/app/topics/[slug]/page.jsx
    - src/app/search/page.jsx

key-decisions:
  - "Created login/layout.jsx for metadata since login/page.jsx is a client component"
  - "Homepage uses plain title string to override layout template for brand page"
  - "Layout-level alternates.canonical: './' provides default for all static pages"

patterns-established:
  - "Canonical URL pattern: layout default + per-page alternates for dynamic routes"
  - "Client component metadata pattern: use route layout.jsx for metadata export"

requirements-completed: [SEO-01, SEO-04, SEO-05]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 17 Plan 01: Meta Tags and Canonical URLs Summary

**Unique meta titles, descriptions, and canonical URLs on all 17+ public pages via Next.js metadata API**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T15:04:08Z
- **Completed:** 2026-03-14T15:06:09Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Added homepage-specific title and description (overrides layout template for brand page)
- Added canonical URL support to layout.jsx (default for all pages) and all 5 dynamic generateMetadata functions
- Created login/layout.jsx to provide metadata for client component login page
- Verified robots.js correctly blocks /admin/, /dashboard/, /api/, /auth/ paths
- Build succeeds with all metadata changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add canonical URL support and missing metadata** - `5b587de` (feat)
2. **Task 2: Verify robots.txt completeness and enhance meta descriptions** - no file changes (verification only, robots.js already correct)

## Files Created/Modified
- `src/app/layout.jsx` - Added alternates.canonical default for all pages
- `src/app/page.jsx` - Added unique homepage metadata with title, description, canonical
- `src/app/login/layout.jsx` - Created for login page metadata (client component workaround)
- `src/app/login/page.jsx` - Added comment noting metadata location
- `src/app/q/[slug]/page.jsx` - Added canonical URL to generateMetadata
- `src/app/answers/[id]/page.jsx` - Added canonical URL to generateMetadata
- `src/app/expert/[handle]/page.jsx` - Added canonical URL to generateMetadata
- `src/app/topics/[slug]/page.jsx` - Added canonical URL to generateMetadata
- `src/app/search/page.jsx` - Added canonical URL to generateMetadata (no query params)

## Decisions Made
- Created login/layout.jsx rather than converting login/page.jsx to server component, since it uses client-side hooks (useState, useSearchParams)
- Homepage title uses plain string to override the layout template pattern, ensuring full brand title appears
- Search page canonical URL omits query parameters to avoid infinite canonical variations

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created login/layout.jsx for client component metadata**
- **Found during:** Task 1 (login metadata)
- **Issue:** Plan said to add metadata export to login/page.jsx, but it's a 'use client' component which cannot export metadata
- **Fix:** Created src/app/login/layout.jsx as a server component wrapper with metadata export
- **Files modified:** src/app/login/layout.jsx (created), src/app/login/page.jsx (comment added)
- **Verification:** Build succeeds, metadata present in login route
- **Committed in:** 5b587de (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary because Next.js client components cannot export metadata. Standard pattern.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All pages have metadata foundation ready for structured data (JSON-LD) in plan 17-02
- Canonical URLs established for sitemap cross-referencing
- Build verified clean

---
*Phase: 17-seo*
*Completed: 2026-03-14*

## Self-Check: PASSED
