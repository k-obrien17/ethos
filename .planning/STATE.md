# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** Phase 3 — Expert Identity

## Current Phase

**Phase:** 3 — Expert Identity
**Status:** Planned
**Plans:** 3 plans across 2 waves (see `.planning/phases/03-expert-identity/PLAN-01..03.md`)

## Phase History

| Phase | Status | Plans |
|-------|--------|-------|
| 1 — Foundation | Complete | 3 plans, 2 waves, 18 tasks, 8 requirements |
| 2 — Core Loop | Complete | 3 plans, 2 waves, 18 tasks, 15 requirements |
| 3 — Expert Identity | Planned | 3 plans, 2 waves, 11 tasks, 5 requirements |

## Recent Activity

- 2026-02-25: Project initialized
- 2026-02-25: Codebase mapped (.planning/codebase/)
- 2026-02-25: Research completed (.planning/research/)
- 2026-02-25: Requirements defined (38 v1 requirements)
- 2026-02-25: Roadmap created (5 phases)
- 2026-02-25: Phase 1 planned (3 plans, 2 waves, 18 tasks, 8 requirements covered)
- 2026-02-25: Phase 2 researched and planned (3 plans, 2 waves, 18 tasks, 15 requirements covered)
- 2026-02-25: Phase 1 executed — Next.js 16 scaffold, Supabase schema/RLS migrations, auth flow (OAuth callback, login page, admin layout, dashboard)
- 2026-02-25: Phase 2 executed — submit_answer() advisory lock, public pages (homepage, question feed, question detail, answer detail), answer form with three-layer budget enforcement and draft auto-save
- 2026-02-25: Phase 3 researched and planned (3 plans, 2 waves, 11 tasks, 5 requirements covered)

## Open Questions

| Question | Impact | When to Decide |
|----------|--------|----------------|
| Calendar month vs. rolling window for answer budget | **Decided: calendar month** — implemented in submit_answer() | Resolved |
| LinkedIn app: Development mode (20 users) vs. Production (requires review) | Blocks beta scale beyond 20 users | Apply for Production in week 1 |
| 3 free / 5 premium answer limits — are these right? | Core product feel — too tight kills engagement, too loose kills signal | Ship 3/5 for beta, instrument and measure utilization |
| Hide other answers until expert submits their own? | Prevents anchoring but reduces read engagement | UX decision — not implemented, answers visible before answering |
| Supabase free tier vs. Pro ($25/month) for beta | Auto-pause risk vs. cost | Upgrade when 10+ regular users |
| Soft word guidance (100-500) vs. hard min/max on answers | **Decided: soft** — no hard limits, min 10 chars only | Resolved |
| Image uploads for expert avatars vs. OAuth-provided only | **Decided: OAuth-only for v1** — no upload, use OAuth avatar | Resolved |

## Notes

- Old Daily 10 Tauri app has been replaced with fresh Next.js 16 + Supabase project
- Stack verified through research — see .planning/research/STACK.md for exact deps
- Docker not available locally — Supabase migrations verified via SQL review, not `supabase db reset`
- Manual steps pending: OAuth provider config (Google Console, LinkedIn Dev Portal, Supabase Dashboard), Vercel deployment
- Next.js 16 deprecates `middleware` in favor of `proxy` convention — current middleware works fine, consider migrating later
