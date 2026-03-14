# Requirements: Ethos

**Defined:** 2026-03-14
**Core Value:** The limited answer budget turns every response into a statement of identity — what you choose to answer reveals what you stand for.

## v6 Requirements

Requirements for Scale & Infrastructure milestone. Each maps to roadmap phases.

### Deploy Pipeline

- [ ] **DPLY-01**: GitHub Actions CI runs lint and build checks on every push
- [ ] **DPLY-02**: Vercel preview deployments are created for every pull request
- [ ] **DPLY-03**: Database migrations have a documented workflow (apply before deploy, rollback plan)
- [ ] **DPLY-04**: Production deploys require passing CI checks before merge to main

### Caching

- [ ] **CACH-01**: Static pages (legal, leaderboard) use ISR with appropriate revalidation intervals
- [ ] **CACH-02**: Dynamic pages use streaming with Suspense boundaries for fast TTFB
- [ ] **CACH-03**: Supabase query results are cached where appropriate (topic list, site settings)
- [ ] **CACH-04**: Static assets (fonts, icons) have long-lived cache headers

### Monitoring

- [ ] **MNTR-01**: Server-side errors are captured with structured logging (route, user, error details)
- [ ] **MNTR-02**: A /api/health endpoint returns status and basic diagnostics
- [ ] **MNTR-03**: Admin can view recent errors on an admin monitoring page
- [ ] **MNTR-04**: External uptime monitoring checks the health endpoint on a schedule

## v5 Requirements (Complete)

See [v5-REQUIREMENTS.md](milestones/v5-REQUIREMENTS.md) for full archive.

## Future Requirements

Deferred to future release. Not in current roadmap.

### Monetization

- **MONET-01**: Premium subscription with enhanced features
- **MONET-02**: Sponsored/partner questions

### Content Quality

- **QUAL-01**: AI detection enforcement on answer submission
- **QUAL-02**: Content reporting and moderation tools

### Engagement

- **ENGAGE-01**: Milestone achievements (first answer, 10 followers, etc.)

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-generated questions | Editorial team curates manually |
| Native mobile apps | Web-first, responsive design covers mobile |
| Gamification (points, badges, leaderboards) | Trivializes expertise |
| Real-time notifications (WebSocket) | Polling/page-load fetch sufficient at beta scale |
| Full staging environment | Preview deploys sufficient for solo operator |
| External error tracking (Sentry) | Deferred — build monitoring wiring first, add provider later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DPLY-01 | TBD | Pending |
| DPLY-02 | TBD | Pending |
| DPLY-03 | TBD | Pending |
| DPLY-04 | TBD | Pending |
| CACH-01 | TBD | Pending |
| CACH-02 | TBD | Pending |
| CACH-03 | TBD | Pending |
| CACH-04 | TBD | Pending |
| MNTR-01 | TBD | Pending |
| MNTR-02 | TBD | Pending |
| MNTR-03 | TBD | Pending |
| MNTR-04 | TBD | Pending |

**Coverage:**
- v6 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12 ⚠️

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after initial definition*
