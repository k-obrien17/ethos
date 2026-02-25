# Ethos

## What This Is

A public content platform where influencers and subject-matter experts answer one curated question per day — but can only use 3-5 answers per month. The scarcity makes each answer a deliberate signal of expertise. Users browse answers by question (what did experts say about X?) and by person (what does this expert choose to weigh in on?). Built as a responsive web app for beta launch with 20-50 real users.

## Core Value

The limited answer budget turns every response into a statement of identity — what you choose to answer reveals what you stand for.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] One curated question published per day
- [ ] Users can preview upcoming questions (queue depth tiered by plan)
- [ ] Monthly answer limit (3 for free, 5+ for premium)
- [ ] Public feed: browse by question (all expert answers under one question)
- [ ] Public feed: browse by person (expert's answer history)
- [ ] Expert profiles with answer archive
- [ ] Shareable answer links (works on social platforms)
- [ ] Admin panel: manage question queue (create, schedule, reorder)
- [ ] Admin panel: multi-editor support (2-5 editorial team members)
- [ ] Social login (LinkedIn + Google OAuth)
- [ ] Free tier: 3 answers/month, limited queue preview
- [ ] Premium tier: 5+ answers/month, full month queue preview, analytics on reach

### Out of Scope

- Native mobile apps — web-first, responsive design covers mobile
- Payments/billing — beta is free-tier only, premium comes after validation
- AI-generated questions — editorial team curates manually
- Comments/reactions on answers — keep v1 focused on the answer itself
- Following/notifications — discovery is feed-based for now, social graph later
- The existing Tauri desktop app code — clean break, different product

## Context

- Evolved from a personal journaling app (Daily 10) — the "question a day" concept is proven in Keith's own habit
- Target users are LinkedIn-style thought leaders, industry experts, consultants
- The scarcity mechanic (limited answers/month) is the core differentiator — this is NOT another Quora
- Queue preview creates a strategic game: skip today's question to save your answer for Thursday's
- Tiered queue visibility (free sees less, premium sees full month) is the primary monetization lever
- Content is public by default — the platform's value grows with every visible answer
- Solo operator (Keith at Total Emphasis) with a small editorial team for question curation

## Constraints

- **Stack:** Next.js + Supabase (Postgres + Auth) + Vercel + Tailwind CSS
- **Auth:** Supabase Auth with LinkedIn and Google OAuth providers
- **Team:** Solo developer, must be maintainable by one person
- **Timeline:** Beta launch scope — enough to validate with 20-50 real users
- **Budget:** Free tiers of Supabase + Vercel for beta (upgrade when traction warrants)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh start (not evolving Tauri app) | Completely different product — multi-user web platform vs. local journaling app | — Pending |
| Next.js + Supabase + Vercel | Least moving parts for solo operator. Auth, DB, hosting all integrated. Free tiers cover beta. | — Pending |
| Both feed views from day one | Question-centric and person-centric views both serve the product — scarcity mechanic makes "who chose to answer" as interesting as the answers | — Pending |
| Beta launch scope (no payments) | Validate the core loop (question → selective answering → public feed) before building billing | — Pending |
| Social login only (no email/password) | Target users live on LinkedIn — reduce friction, get real identity | — Pending |
| 3-5 answers/month limit | Small enough to force real selectivity — each answer is a statement | — Pending |
| Tiered queue preview | Free sees limited ahead, premium sees full month — natural upsell tied to core mechanic | — Pending |

---
*Last updated: 2026-02-25 after initialization*
