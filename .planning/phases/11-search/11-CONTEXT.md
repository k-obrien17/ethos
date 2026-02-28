# Phase 11: Search - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can find any question, answer, or expert through a single unified search experience. Includes a persistent search bar, typeahead suggestions, a dedicated results page with relevance ranking, and filtering by content type, topic, and date range.

</domain>

<decisions>
## Implementation Decisions

### Search bar & entry point
- Always-visible search input in the top navigation bar on every page
- Submitting a search navigates to a dedicated `/search?q=...` results page
- Keyboard shortcut (`/` or `Cmd+K`) to focus the search bar from anywhere
- On mobile/narrow screens: magnifying glass icon in nav, tapping expands to full-width input pushing other nav elements aside

### Results layout
- All result types (questions, answers, experts) interleaved in one list, ranked by relevance
- Each result shows a type badge (Question, Answer, Expert) for visual differentiation
- Result display: title/name + highlighted snippet with search terms bolded + metadata (topic tags, date, author) — ~2-3 lines per result
- No-results state: helpful message ("No results for 'xyz'. Try different keywords.") plus trending topics or popular questions as fallback content

### Typeahead experience
- Rich suggestions with type icons — each suggestion shows match text plus an icon/badge for its type
- Selecting a suggestion navigates directly to that item (question page, answer, expert profile)
- 5-7 suggestions displayed, plus a "See all results for 'xyz'" link at bottom
- When search bar is focused (before typing), show recent searches from localStorage
- Once user types 2+ characters, switch to live suggestions
- "See all results" link at bottom always present during live suggestions

### Filter mechanics
- Content type filter: horizontal chip toggles above results — All | Questions | Answers | Experts. Click to filter, click again to remove
- Topic filter: dropdown/select next to the type chips, populated from the topic taxonomy
- Date range filter: dropdown with preset ranges — Any time, Past week, Past month, Past 3 months, Past year
- All filter state reflected in URL params (`/search?q=ethics&type=question&topic=leadership&range=month`) — shareable, works with browser back button

### Claude's Discretion
- Pagination approach (traditional page numbers vs load more)
- Keyboard navigation in typeahead dropdown (arrow keys, Enter, Escape)
- Loading states and skeleton design
- Exact spacing, typography, and result card styling
- Debounce timing for typeahead API calls
- Search ranking algorithm details

</decisions>

<specifics>
## Specific Ideas

- Search bar should be a familiar pattern — always visible, never hidden behind navigation
- Typeahead should feel snappy and direct — selecting a suggestion takes you straight to that content
- Recent searches provide quick re-access without remembering exact terms
- Filters should be lightweight and inline (chips + dropdowns), not a heavy sidebar

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-search*
*Context gathered: 2026-02-28*
