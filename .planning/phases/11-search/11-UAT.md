---
status: testing
phase: 11-search
source: 11-01-SUMMARY.md, 11-02-SUMMARY.md
started: 2026-02-28T15:00:00Z
updated: 2026-02-28T15:00:00Z
---

## Current Test

number: 1
name: Search Results Page
expected: |
  Navigate to /search?q=leadership (or any term matching your data). You should see a results page with a search input at top, filter controls below it, and a list of results. Each result should show a color-coded type badge (blue "Question", green "Answer", or purple "Expert"), a title, a snippet with matched terms highlighted, and metadata (date, author, topics).
awaiting: user response

## Tests

### 1. Search Results Page
expected: Navigate to /search?q=leadership (or any term matching your data). Results page shows search input, filter bar, and interleaved results from questions, answers, and expert profiles — each with a type badge, highlighted snippet, and metadata.
result: [pending]

### 2. Type Filter Chips
expected: On the search results page, you see horizontal chips: All, Questions, Answers, Experts. Clicking "Questions" narrows results to only questions. Clicking "All" removes the filter. URL updates to include &type=question (or similar) and browser back button restores previous filter state.
result: [pending]

### 3. Topic Filter Dropdown
expected: A topic dropdown appears next to the type chips. Selecting a topic filters results to only those tagged with that topic. URL updates with &topic=... parameter.
result: [pending]

### 4. Date Range Filter
expected: A date range dropdown shows options: Any time, Past week, Past month, Past 3 months, Past year. Selecting a range filters results by date. URL updates with &range=... parameter.
result: [pending]

### 5. No-Results State
expected: Search for a nonsense term (e.g., /search?q=xyzzyflurb). Instead of an empty page, you see "No results for 'xyzzyflurb'" with a suggestion to try different keywords, plus trending topic pills you can click to browse.
result: [pending]

### 6. Search Bar in Navigation
expected: On every page (home, topics, archive, expert profiles), a search input is visible in the top navigation bar. On desktop it appears as a text input with a magnifying glass icon. Typing and pressing Enter navigates to /search?q=...
result: [pending]

### 7. Cmd+K Keyboard Shortcut
expected: From any page, press Cmd+K (Mac) or Ctrl+K (Windows). The search bar in the nav should receive focus immediately, ready for typing. You should see a "Cmd+K" hint badge on the search input (desktop only).
result: [pending]

### 8. Typeahead Suggestions
expected: Focus the search bar and type 2+ characters. After a brief delay (~250ms), a dropdown appears below the input showing up to 7 suggestions. Each suggestion has a type icon (magnifying glass for questions, chat bubble for answers, person for experts), a title, and an optional subtitle. A "See all results for '...'" link appears at the bottom.
result: [pending]

### 9. Typeahead Navigation and Selection
expected: With typeahead suggestions visible, press Arrow Down/Up to highlight suggestions. The highlighted item has a distinct background. Pressing Enter on a highlighted suggestion navigates directly to that item's page (question page, answer, or expert profile). Pressing Escape closes the dropdown.
result: [pending]

### 10. Recent Searches
expected: Focus the search bar without typing anything. If you've previously searched for terms, you see a list of your recent searches (up to 5) with clock icons. Clicking one navigates to /search?q=... for that term. A "Clear recent searches" option is available.
result: [pending]

### 11. Mobile Search Experience
expected: On a narrow screen (or browser resized narrow), the search bar collapses to a magnifying glass icon. Tapping it expands a full-width search input overlay with a Cancel button. Typing and submitting works the same as desktop. Tapping Cancel collapses back to the icon.
result: [pending]

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]
