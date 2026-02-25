# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** Phase 2 — Core Loop

## Current Phase

**Phase:** 2 — Core Loop
**Status:** Planned
**Plans:** 3 plans across 2 waves (see `.planning/phases/02-core-loop/PLAN-01..03.md`)

## Phase History

| Phase | Status | Plans |
|-------|--------|-------|
| 1 — Foundation | Complete | 3 plans, 2 waves, 18 tasks, 8 requirements |
| 2 — Core Loop | Planned | 3 plans, 2 waves, 18 tasks, 15 requirements |

## Recent Activity

- 2026-02-25: Project initialized
- 2026-02-25: Codebase mapped (.planning/codebase/)
- 2026-02-25: Research completed (.planning/research/)
- 2026-02-25: Requirements defined (38 v1 requirements)
- 2026-02-25: Roadmap created (5 phases)
- 2026-02-25: Phase 1 planned (3 plans, 2 waves, 18 tasks, 8 requirements covered)
- 2026-02-25: Phase 2 researched and planned (3 plans, 2 waves, 18 tasks, 15 requirements covered)
- 2026-02-25: Phase 1 executed — Next.js 16 scaffold, Supabase schema/RLS migrations, auth flow (OAuth callback, login page, admin layout, dashboard)

## Open Questions

| Question | Impact | When to Decide |
|----------|--------|----------------|
| Calendar month vs. rolling window for answer budget | Core mechanic behavior — affects engagement curves | Before building answer-budget system |
| LinkedIn app: Development mode (20 users) vs. Production (requires review) | Blocks beta scale beyond 20 users | Apply for Production in week 1 |
| 3 free / 5 premium answer limits — are these right? | Core product feel — too tight kills engagement, too loose kills signal | Ship 3/5 for beta, instrument and measure utilization |
| Hide other answers until expert submits their own? | Prevents anchoring but reduces read engagement | UX decision during answer submission build |
| Supabase free tier vs. Pro ($25/month) for beta | Auto-pause risk vs. cost | Upgrade when 10+ regular users |
| Soft word guidance (100-500) vs. hard min/max on answers | Prevents throwaway answers but adds friction | During answer form build |
| Image uploads for expert avatars vs. OAuth-provided only | Affects profile quality and storage needs | During profile implementation |

## Notes

- Old Daily 10 Tauri app has been replaced with fresh Next.js 16 + Supabase project
- Stack verified through research — see .planning/research/STACK.md for exact deps
- Docker not available locally — Supabase migrations verified via SQL review, not `supabase db reset`
- Manual steps pending: OAuth provider config (Google Console, LinkedIn Dev Portal, Supabase Dashboard), Vercel deployment
- Next.js 16 deprecates `middleware` in favor of `proxy` convention — current middleware works fine, consider migrating later
