# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** v1 complete and archived — ready for deployment, then v2 planning

## Current Milestone

**Milestone:** v1 (beta launch)
**Status:** Complete — archived to `.planning/milestones/`

## Milestone History

| Milestone | Status | Phases | Requirements | Archived |
|-----------|--------|--------|-------------|----------|
| v1 — Beta Launch | Complete | 5 phases, 15 plans | 38 (37 pass, 1 manual) | `.planning/milestones/v1-*` |

## Recent Activity

- 2026-02-25: Project initialized (research, requirements, roadmap)
- 2026-02-25: Phase 1 executed — Next.js 16 scaffold, Supabase schema/RLS, auth flow
- 2026-02-25: Phase 2 executed — submit_answer() advisory lock, public pages, answer form
- 2026-02-25: Phase 3 executed — profile fields, public expert profiles, dashboard stats
- 2026-02-25: Phase 4 executed — question CRUD, queue dashboard, answer moderation
- 2026-02-25: Phase 5 executed — OG meta, social cards, responsive, account deletion, legal pages
- 2026-02-25: UAT verification — 37/38 PASS, 0 FAIL, 1 MANUAL
- 2026-02-25: Milestone audit — 18/18 integration points verified
- 2026-02-25: v1 milestone archived

## Open Questions

| Question | Impact | When to Decide |
|----------|--------|----------------|
| LinkedIn app: Development mode (20 users) vs. Production | Blocks beta scale beyond 20 users | Apply for Production in week 1 |
| 3 free / 5 premium answer limits — are these right? | Core product feel | Ship 3 for beta, instrument and measure |
| Hide other answers until expert submits their own? | Prevents anchoring but reduces read engagement | UX decision for v2 |
| Supabase free tier vs. Pro ($25/month) for beta | Auto-pause risk vs. cost | Upgrade when 10+ regular users |

## Notes

- Stack: Next.js 16 + Supabase + Vercel + Tailwind CSS v4
- Docker not available locally — migrations verified via SQL review
- Manual steps pending: OAuth provider config, Vercel deployment, production migrations, admin user promotion
