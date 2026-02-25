# Ethos

## What This Is

A public content platform where influencers and subject-matter experts answer one curated question per day — but can only use 3-5 answers per month. The scarcity makes each answer a deliberate signal of expertise. Users browse answers by question (what did experts say about X?) and by person (what does this expert choose to weigh in on?). Built as a responsive web app for beta launch with 20-50 real users.

## Core Value

The limited answer budget turns every response into a statement of identity — what you choose to answer reveals what you stand for.

## Current State

**Shipped:** v1 (beta launch) — 2026-02-25
**Status:** Code-complete, pending deployment

v1 includes: auth (Google + LinkedIn), profiles, daily questions, answer submission with three-layer budget enforcement, public feeds, expert profiles with selectivity metrics, editorial admin panel, social sharing with OG images, account deletion, legal pages.

**To deploy:** Configure OAuth providers, deploy to Vercel, run Supabase migrations, promote admin user.

## Requirements

### Validated (v1)

- [x] 37/38 requirements pass code-level verification
- [x] 18/18 cross-phase integration points verified
- [ ] INFR-01: Vercel deployment (manual verification needed)

See [v1-REQUIREMENTS.md](milestones/v1-REQUIREMENTS.md) for full requirements archive.

### Active

(None — v1 complete. Define v2 requirements with `/gsd:new-milestone`)

### Out of Scope

- Native mobile apps — web-first, responsive design covers mobile
- AI-generated questions — editorial team curates manually
- Comments/reactions on answers — keep focused on the answer itself
- Following/notifications — discovery is feed-based for now
- Gamification (points, badges, leaderboards) — trivializes expertise
- The existing Tauri desktop app code — clean break, different product

## Context

- Evolved from a personal journaling app (Daily 10) — the "question a day" concept is proven in Keith's own habit
- Target users are LinkedIn-style thought leaders, industry experts, consultants
- The scarcity mechanic (limited answers/month) is the core differentiator — this is NOT another Quora
- Queue preview creates a strategic game: skip today's question to save your answer for Thursday's
- Content is public by default — the platform's value grows with every visible answer
- Solo operator (Keith at Total Emphasis) with a small editorial team for question curation

## Constraints

- **Stack:** Next.js 16 + Supabase (Postgres + Auth) + Vercel + Tailwind CSS v4
- **Auth:** Supabase Auth with LinkedIn and Google OAuth providers
- **Team:** Solo developer, must be maintainable by one person
- **Budget:** Free tiers of Supabase + Vercel for beta (upgrade when traction warrants)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh start (not evolving Tauri app) | Completely different product — multi-user web platform vs. local journaling app | Shipped v1 |
| Next.js + Supabase + Vercel | Least moving parts for solo operator. Auth, DB, hosting all integrated. | Shipped v1 |
| Both feed views from day one | Question-centric and person-centric views both serve the product | Shipped v1 |
| Beta launch scope (no payments) | Validate the core loop before building billing | Shipped v1 |
| Social login only (no email/password) | Target users live on LinkedIn — reduce friction, get real identity | Shipped v1 |
| 3 answers/month limit | Small enough to force real selectivity — each answer is a statement | Shipped v1 — instrument and measure |
| Calendar month reset (not rolling) | Simpler mental model, implemented via date_trunc('month', now()) | Shipped v1 |

---
*Last updated: 2026-02-25 after v1 milestone completion*
