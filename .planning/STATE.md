# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** v2 — Engagement & Retention (24 requirements, 4 phases)

## Current Milestone

**Milestone:** v2 (engagement & retention)
**Status:** Phase 9 planned — ready for `/gsd:execute-phase 9`

## Milestone History

| Milestone | Status | Phases | Requirements | Archived |
|-----------|--------|--------|-------------|----------|
| v1 — Beta Launch | Complete | 5 phases, 15 plans | 38 (37 pass, 1 manual) | `.planning/milestones/v1-*` |
| v2 — Engagement | Active | 4 phases (6-9) planned | 24 defined | — |

## Phase History

| Phase | Status | Plans |
|-------|--------|-------|
| 1-5 (v1) | Complete | See v1 archive |
| 6 — Onboarding & Compose Polish | Complete | 3 plans, 2 waves, 10 tasks, 5 requirements |
| 7 — Queue Preview & Featured | Complete | 2 plans, 1 wave, 8 tasks, 8 requirements |
| 8 — Email Notifications | Complete | 3 plans, 2 waves, 10 tasks, 7 requirements |
| 9 — Activity & Bookmarks | Planned | 2 plans, 2 waves, 10 tasks, 4 requirements |

## Recent Activity

- 2026-02-25: v1 milestone completed and archived
- 2026-02-25: v2 milestone started — requirements and roadmap defined (24 requirements, 4 phases)
- 2026-02-25: Phase 6 executed — welcome flow, first-answer nudge, Markdown preview, 15-min edit window
- 2026-02-25: Phase 7 planned — queue preview (RLS + /questions/upcoming) and featured answers (admin toggle + badge + sorting)
- 2026-02-25: Phase 7 executed — queue preview page, upcoming nav link, featured answers (migration, admin toggle, badge, sorting)
- 2026-02-25: Phase 8 planned — Resend integration, email preferences, unsubscribe, featured notification, daily/weekly/budget cron emails
- 2026-02-25: Phase 8 executed — Resend SDK, email utility, preferences page, unsubscribe route, featured email hook, daily cron with 3 email types
- 2026-02-25: Phase 9 planned — bookmarks (table + RLS + toggle + dashboard + cron notification) and view counts (column + RPC + API route + dashboard stat)

## Open Questions

| Question | Impact | When to Decide |
|----------|--------|----------------|
| v1 deployment timing vs. v2 development | Deploy v1 before or during v2 work? | Now |

## Notes

- v1 is code-complete but not yet deployed — deployment can happen in parallel with v2 planning/execution
- Resend integrated for email (Phase 8) — API key needed in env
- Queue preview depth decided: 3 days default, configurable 1-7 per profile, RLS caps at 7
- Featured answer pattern mirrors hidden_at/hidden_by — same migration + Server Action + toggle button approach
- View counts decided: API route + RPC function for atomic increment, author-only display on dashboard
- Bookmarks: dedicated table with composite PK, RLS, bookmark notification integrated into existing daily cron
