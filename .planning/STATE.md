# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** v2 — Engagement & Retention (24 requirements, 4 phases)

## Current Milestone

**Milestone:** v2 (engagement & retention)
**Status:** Phase 8 complete — ready for `/gsd:plan-phase 9`

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
| 9 — Activity & Bookmarks | Not planned | — |

## Recent Activity

- 2026-02-25: v1 milestone completed and archived
- 2026-02-25: v2 milestone started — requirements and roadmap defined (24 requirements, 4 phases)
- 2026-02-25: Phase 6 executed — welcome flow, first-answer nudge, Markdown preview, 15-min edit window
- 2026-02-25: Phase 7 planned — queue preview (RLS + /questions/upcoming) and featured answers (admin toggle + badge + sorting)
- 2026-02-25: Phase 7 executed — queue preview page, upcoming nav link, featured answers (migration, admin toggle, badge, sorting)
- 2026-02-25: Phase 8 planned — Resend integration, email preferences, unsubscribe, featured notification, daily/weekly/budget cron emails
- 2026-02-25: Phase 8 executed — Resend SDK, email utility, preferences page, unsubscribe route, featured email hook, daily cron with 3 email types

## Open Questions

| Question | Impact | When to Decide |
|----------|--------|----------------|
| Resend vs. SendGrid vs. SES for email | Email infrastructure choice | Phase 8 research |
| View count implementation: API route vs. middleware vs. edge | Performance and accuracy tradeoff | Phase 9 planning |
| Vercel Cron vs. pg_cron for scheduled emails | Deployment simplicity vs. DB proximity | Phase 8 planning |
| v1 deployment timing vs. v2 development | Deploy v1 before or during v2 work? | Now |

## Notes

- v1 is code-complete but not yet deployed — deployment can happen in parallel with v2 planning/execution
- No email service currently integrated — Phase 8 will need API key setup
- Queue preview depth decided: 3 days default, configurable 1-7 per profile, RLS caps at 7
- Featured answer pattern mirrors hidden_at/hidden_by — same migration + Server Action + toggle button approach
