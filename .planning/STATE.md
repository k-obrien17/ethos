# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-12)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** v4 Social & Engagement -- Phase 14 (Comments)

## Current Position

Phase: 14 of 16 (Comments)
Plan: 1 of 1 complete
Status: Phase 14 complete
Last activity: 2026-03-12 -- Phase 14 Comments complete

Progress: [███░░░░░░░] 33%

## Current Milestone

**Milestone:** v4 (Social & Engagement)
**Status:** Phase 14 complete, ready for Phase 15

## Milestone History

| Milestone | Status | Phases | Requirements | Archived |
|-----------|--------|--------|-------------|----------|
| v1 -- Beta Launch | Complete | 5 phases, 15 plans | 38 (37 pass, 1 manual) | `.planning/milestones/v1-*` |
| v2 -- Engagement | Complete | 4 phases, 10 plans | 24 (24 pass) | `.planning/milestones/v2-*` |
| v3 -- Discovery | Complete | 4 phases, 8 plans | 12 (12 pass) | `.planning/milestones/v3-*` |

## Performance Metrics

**Velocity (v3 baseline):**
- Total plans completed: 8
- Average duration: 3min
- Total execution time: 23min

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v4 builds on existing v2 notification infrastructure (in-app page at /dashboard/notifications, email via Resend cron)
- Comments use one-level threading (not infinite nesting) per out-of-scope decision
- Follow experts reuses same UX patterns as follow-topics from v3
- Added profile existence check as defense-in-depth in addComment server action
- Allowed self-reply on comments (users can add follow-ups to own comments)

### Pending Todos

None.

### Blockers/Concerns

- v1 + v2 are code-complete but not yet deployed
- Migration 00013_search_indexes.sql must be applied to Supabase before search is functional
- Migration 00023_featured_expert.sql must be applied to Supabase for featured expert functionality

## Session Continuity

Last session: 2026-03-12
Stopped at: Completed 14-01-PLAN.md (Comments hardening)
Resume file: None
