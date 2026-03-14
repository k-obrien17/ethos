---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
last_updated: "2026-03-12T20:23:28.299Z"
progress:
  total_phases: 16
  completed_phases: 7
  total_plans: 13
  completed_plans: 15
---

# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-14)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** v5 Growth & Polish — Defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-14 — Milestone v5 started

## Current Milestone

**Milestone:** v5 (Growth & Polish)
**Status:** Defining requirements

## Milestone History

| Milestone | Status | Phases | Requirements | Archived |
|-----------|--------|--------|-------------|----------|
| v1 -- Beta Launch | Complete | 5 phases, 15 plans | 38 (37 pass, 1 manual) | `.planning/milestones/v1-*` |
| v2 -- Engagement | Complete | 4 phases, 10 plans | 24 (24 pass) | `.planning/milestones/v2-*` |
| v3 -- Discovery | Complete | 4 phases, 8 plans | 12 (12 pass) | `.planning/milestones/v3-*` |
| v4 -- Social & Engagement | Complete | 3 phases, 5 plans | 15 (15 pass) | `.planning/milestones/v4-*` |

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
- [Phase 15-01]: FollowButtonSmall uses stopPropagation pattern for buttons inside Link wrappers; follows query runs in parallel with existing fetches
- [Phase 15-02]: Used Set for O(1) followedExpertIds lookup in feed sort comparator
- [Phase 16-01]: Used admin client for follower notification fan-out (bypasses RLS); skip reply notification when parent author is answer author (avoids duplicate)
- [Phase 16-02]: Dual-toggle preference pattern (_inapp/_email suffixed keys in JSONB); excluded featured_answer from digest (already real-time email)

### Pending Todos

None.

### Blockers/Concerns

- v1 + v2 are code-complete but not yet deployed
- Migration 00013_search_indexes.sql must be applied to Supabase before search is functional
- Migration 00023_featured_expert.sql must be applied to Supabase for featured expert functionality
- Migration 00025_notification_types.sql must be applied to Supabase for new notification types

## Session Continuity

Last session: 2026-03-12
Stopped at: Completed 16-02-PLAN.md (Notification preferences and email digest)
Resume file: None
