# Ethos

## What This Is

A public content platform where influencers and subject-matter experts answer one curated question per day — but can only use 3-5 answers per month. The scarcity makes each answer a deliberate signal of expertise. Users browse answers by question (what did experts say about X?) and by person (what does this expert choose to weigh in on?). Built as a responsive web app for beta launch with 20-50 real users.

## Core Value

The limited answer budget turns every response into a statement of identity — what you choose to answer reveals what you stand for.

## Current Milestone: v3 Discovery & Content Organization

**Goal:** Make every answer findable — by topic, by search, by quality signal — so users always have a reason to browse.

**Target features:**
- Full-text search across questions, answers, and experts
- Topic taxonomy for questions with browse-by-topic pages
- Trending/popular content surfacing on homepage
- Answer archives for past questions
- Expert directory with topic filtering
- Related content connections (other answers, more from expert)

## Current State

**Shipped:** v2 (engagement & retention) — 2026-02-25
**Previous:** v1 (beta launch) — 2026-02-25

v1 includes: auth (Google + LinkedIn), profiles, daily questions, answer submission with three-layer budget enforcement, public feeds, expert profiles with selectivity metrics, editorial admin panel, social sharing with OG images, account deletion, legal pages.

v2 adds: onboarding flow, Markdown preview, 15-min edit window, queue preview, featured answers, email notifications (Resend), bookmarks, view counts.

## Requirements

### Validated (v1)

- [x] 37/38 requirements pass code-level verification
- [x] 18/18 cross-phase integration points verified
- [ ] INFR-01: Vercel deployment (manual verification needed)

See [v1-REQUIREMENTS.md](milestones/v1-REQUIREMENTS.md) for full requirements archive.

### Validated (v2)

- [x] 24/24 requirements pass code-level verification
- [x] 4/4 cross-phase integration points verified
- [x] 4/4 E2E flows verified

See [v2-REQUIREMENTS.md](milestones/v2-REQUIREMENTS.md) for full requirements archive.

### Active (v3)

- [ ] Full-text search across questions, answers, and experts
- [ ] Topic taxonomy and browse-by-topic pages
- [ ] Trending/popular content surfacing
- [ ] Answer archives for past questions
- [ ] Expert directory with topic filtering
- [ ] Related content connections

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
- **Email:** Resend transactional email with Vercel Cron
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
| Engagement before monetization | Validate retention with free users before building billing | Shipped v2 |
| Resend for transactional email | Simple API, good Next.js integration, generous free tier | Shipped v2 |
| 15-min edit window (not unlimited) | Preserves "permanent record" feel while allowing typo fixes | Shipped v2 |
| Queue preview (configurable 1-7 days) | Strategic visibility without ruining surprise — default 3 days | Shipped v2 |
| View counts author-only | Prevents popularity contest, gives authors private engagement signal | Shipped v2 |

---
*Last updated: 2026-02-27 after v3 milestone start*
