# Project State: Ethos

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** The limited answer budget turns every response into a statement of identity.
**Current focus:** Phase 1 — Foundation

## Current Phase

**Phase:** 1 — Foundation
**Status:** Planned
**Plans:** 3 plans across 2 waves (see `.planning/phases/01-foundation/PLAN-01..03.md`)

## Recent Activity

- 2026-02-25: Project initialized
- 2026-02-25: Codebase mapped (.planning/codebase/)
- 2026-02-25: Research completed (.planning/research/)
- 2026-02-25: Requirements defined (38 v1 requirements)
- 2026-02-25: Roadmap created (5 phases)
- 2026-02-25: Phase 1 planned (3 plans, 2 waves, 18 tasks, 8 requirements covered)

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

- Existing codebase is the old Daily 10 Tauri app — being replaced, not evolved
- Fresh Next.js + Supabase + Vercel build
- Stack verified through research — see .planning/research/STACK.md for exact deps
