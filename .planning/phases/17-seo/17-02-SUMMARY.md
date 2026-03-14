---
phase: 17-seo
plan: 02
subsystem: seo
tags: [json-ld, structured-data, sitemap, schema-org, rich-results]

requires:
  - phase: 17-seo-01
    provides: "Meta tags and OG image foundation for SEO pages"
provides:
  - "QAPage JSON-LD structured data on question pages"
  - "Article JSON-LD structured data on answer pages"
  - "Answer URLs in dynamic sitemap"
affects: []

tech-stack:
  added: []
  patterns: [json-ld-structured-data, schema-org-qapage, schema-org-article]

key-files:
  created: []
  modified:
    - src/app/q/[slug]/page.jsx
    - src/app/answers/[id]/page.jsx
    - src/app/sitemap.js

key-decisions:
  - "Used sortedAnswers (featured-first order) for JSON-LD acceptedAnswer selection"
  - "Truncated answer body to 500 chars in JSON-LD to keep payload reasonable"
  - "Answer sitemap entries set to monthly changeFrequency and 0.5 priority"

patterns-established:
  - "JSON-LD pattern: build object inline, render via script dangerouslySetInnerHTML"

requirements-completed: [SEO-02, SEO-03]

duration: 2min
completed: 2026-03-14
---

# Phase 17 Plan 02: Structured Data and Sitemap Enhancement Summary

**QAPage and Article JSON-LD structured data on question/answer pages, plus answer URLs in dynamic sitemap**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T15:04:12Z
- **Completed:** 2026-03-14T15:05:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Question pages emit QAPage JSON-LD with question text, answer count, accepted answer, and suggested answers
- Answer pages emit Article JSON-LD with headline, body, author, and publisher
- Sitemap dynamically includes all answer page URLs with creation dates

## Task Commits

Each task was committed atomically:

1. **Task 1: Add JSON-LD structured data to question and answer pages** - `8caebea` (feat)
2. **Task 2: Add answer pages to sitemap** - `5b587de` (feat)

## Files Created/Modified
- `src/app/q/[slug]/page.jsx` - Added QAPage JSON-LD with question body, answer count, accepted/suggested answers
- `src/app/answers/[id]/page.jsx` - Added Article JSON-LD with headline, author, publisher, mainEntityOfPage
- `src/app/sitemap.js` - Added answers query to Promise.all, mapped to sitemap entries

## Decisions Made
- Used sortedAnswers (featured-first ordering) so the featured answer becomes the acceptedAnswer in JSON-LD
- Truncated answer body text to 500 characters in JSON-LD to keep structured data payload reasonable
- Set answer sitemap entries to monthly changeFrequency since answers rarely change after creation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SEO structured data complete for all content pages
- Rich search results enabled for questions (QAPage) and answers (Article)
- Sitemap covers all discoverable content types

---
*Phase: 17-seo*
*Completed: 2026-03-14*
