---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
last_updated: "2026-03-12T01:26:19.227Z"
progress:
  total_phases: 12
  completed_phases: 3
  total_plans: 6
  completed_plans: 8
---

# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-27)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** v3 Discovery & Content Organization — Phase 13 in progress

## Current Position

Phase: 13 of 13 (Expert Directory)
Plan: 2 of 2 complete
Status: Complete
Last activity: 2026-03-11 — completed plan 13-02 (featured expert spotlight)

Progress: [██████████] 100% (v3 — 2 of 2 plans in phase 13)

## Current Milestone

**Milestone:** v3 (Discovery & Content Organization)
**Status:** Milestone complete

## Milestone History

| Milestone | Status | Phases | Requirements | Archived |
|-----------|--------|--------|-------------|----------|
| v1 — Beta Launch | Complete | 5 phases, 15 plans | 38 (37 pass, 1 manual) | `.planning/milestones/v1-*` |
| v2 — Engagement | Complete | 4 phases, 10 plans | 24 (24 pass) | `.planning/milestones/v2-*` |

## Phase History

| Phase | Status | Plans |
|-------|--------|-------|
| 1-5 (v1) | Complete | See v1 archive |
| 6-9 (v2) | Complete | See v2 archive |
| 10 — Topic Taxonomy & Browse | Complete | 2/2 complete |
| 11 — Search | Complete | 2/2 complete |
| 12 — Content Surfacing | Complete | 2/2 complete |
| 13 — Expert Directory | Complete | 2/2 complete |

## Performance Metrics

**Velocity:**
- Total plans completed: 8 (v3)
- Average duration: 3min
- Total execution time: 23min

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 10 | 01 | 5min | 2 | 16 |
| 10 | 02 | 3min | 2 | 9 |
| 11 | 01 | 3min | 2 | 6 |
| 11 | 02 | 2min | 2 | 4 |
| 12 | 01 | 2min | 2 | 3 |
| 12 | 02 | 1min | 1 | 1 |
| 13 | 01 | 4min | 2 | 4 |
| 13 | 02 | 3min | 2 | 6 |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v3 Roadmap: Topics (Phase 10) before Search (Phase 11) — topic taxonomy is foundational for search filters, expert expertise tags, and content organization
- Topic pills are now linked across all public pages (homepage, question, answer, question list)
- Topic assignment inlined in question actions to avoid circular imports with topics.js
- Topic picker uses clickable pill UI with hidden comma-separated UUID input
- QuestionCard restructured: div wrapper with Link (body) + separate topic pill Links to avoid nested anchors
- FollowTopicButton uses optimistic useState + useTransition for instant feedback
- Feed personalization: client-side stable sort of recent questions by followed-topic match
- Used websearch_to_tsquery for Google-like search syntax (quoted phrases, AND, OR, -exclude)
- Unified search_content RPC returns interleaved results ranked by ts_rank across all three content types
- Filter state fully URL-driven for shareability and browser back/forward support
- SearchBar is self-contained client component rendered within server component Header
- Mobile search uses fixed overlay pattern for full-width input on narrow screens
- Typeahead debounced at 250ms with lightweight searchSuggestions action (7 results max)
- Client-side weighted scoring (view_count + like_count*2) for trending answers instead of custom RPC
- /questions/[slug] redirects to /q/[slug] instead of duplicating question detail page
- Related content on answer pages uses parallel neq queries for same-expert and same-question answers
- Expert expertise tags derived from answers -> question_topics -> topics, aggregated per expert
- Expert directory sort/filter implemented as server-side Link elements (no client component)
- site_settings key-value table for featured expert and future site-wide config

### Pending Todos

None.

### Blockers/Concerns

- v1 + v2 are code-complete but not yet deployed
- Migration 00013_search_indexes.sql must be applied to Supabase before search is functional
- Migration 00023_featured_expert.sql must be applied to Supabase for featured expert functionality

## Session Continuity

Last session: 2026-03-11
Stopped at: Completed 13-02-PLAN.md (Phase 13 Expert Directory complete)
Resume file: .planning/phases/13-expert-directory/
