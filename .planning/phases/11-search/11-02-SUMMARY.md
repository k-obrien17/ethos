---
phase: 11-search
plan: 02
subsystem: ui, api
tags: [search-bar, typeahead, keyboard-shortcuts, debounce, localStorage, next.js, client-component]

# Dependency graph
requires:
  - phase: 11-search-01
    provides: search_content RPC function, searchContent server action, /search results page
provides:
  - Persistent search bar in navigation on every page
  - SearchTypeahead dropdown with live suggestions and recent searches
  - searchSuggestions server action for lightweight typeahead results
  - Cmd+K keyboard shortcut for search focus
  - Arrow key navigation within typeahead suggestions
  - Recent search history in localStorage
affects: [12-content-surfacing, 13-expert-directory]

# Tech tracking
tech-stack:
  added: []
  patterns: [debounced server action calls for typeahead, localStorage recent searches, client component in server component header]

key-files:
  created:
    - src/components/SearchBar.jsx
    - src/components/SearchTypeahead.jsx
  modified:
    - src/app/actions/search.js
    - src/components/Header.jsx

key-decisions:
  - "SearchBar is self-contained client component rendered within server component Header"
  - "Mobile search uses fixed overlay pattern instead of inline expand for full-width input"
  - "Recent searches stored in ethos_recent_searches localStorage key following project prefix convention"
  - "Typeahead debounced at 250ms with lightweight searchSuggestions action (7 results max)"

patterns-established:
  - "Client component embedding in server component Header for interactive nav elements"
  - "Debounced server action pattern: useEffect timer clears on each keystroke, fires after 250ms idle"
  - "Keyboard shortcut registration via global keydown listener in useEffect"

requirements-completed: [SRCH-03]

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 11 Plan 02: Search Bar & Typeahead Summary

**Persistent nav search bar with Cmd+K shortcut, debounced typeahead suggestions, recent search history, and full keyboard navigation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T14:53:40Z
- **Completed:** 2026-02-28T14:55:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Lightweight searchSuggestions server action reusing search_content RPC with 7-result limit for fast typeahead
- SearchBar component with responsive behavior (full input on desktop, expandable icon on mobile), Cmd+K shortcut, and form submission to /search
- SearchTypeahead dropdown with debounced live suggestions, recent search history, type icons (question/answer/expert), keyboard navigation, and "See all results" link

## Task Commits

Each task was committed atomically:

1. **Task 1: Add searchSuggestions action for typeahead** - `3a7c6e5` (feat)
2. **Task 2: Search bar in nav with typeahead, recent searches, keyboard shortcuts** - `fc89377` (feat)

**Plan metadata:** (pending) (docs: complete plan)

## Files Created/Modified
- `src/app/actions/search.js` - Added searchSuggestions action for lightweight typeahead results (7 max)
- `src/components/SearchBar.jsx` - Persistent nav search input with Cmd+K, responsive mobile expand, form submission, click-outside-to-close
- `src/components/SearchTypeahead.jsx` - Dropdown with debounced live suggestions, recent searches, type icons, keyboard nav, "See all results" link
- `src/components/Header.jsx` - Added SearchBar import and render, relative positioning for mobile overlay

## Decisions Made
- SearchBar is a self-contained client component that manages its own state, keeping Header as a server component
- Mobile search uses `fixed inset-x-0 top-0` overlay to provide full-width input experience on narrow screens
- Recent searches follow the `ethos_` localStorage prefix convention established by the journaling app
- Typeahead debounce set to 250ms balancing responsiveness and server load
- Keyboard shortcut label shows "Cmd+K" text (hidden on smaller screens) rather than the unicode symbol

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Depends on migration 00013_search_indexes.sql from plan 11-01 already being applied.

## Next Phase Readiness
- Search is fully functional end-to-end: nav bar input, typeahead suggestions, full results page with filters
- Phase 11 (Search) is complete, ready for Phase 12 (Content Surfacing) and Phase 13 (Expert Directory)
- SearchBar and SearchTypeahead are reusable components if needed in other layouts

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 11-search*
*Completed: 2026-02-28*
