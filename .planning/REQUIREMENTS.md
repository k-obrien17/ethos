# Requirements: Ethos

**Defined:** 2026-03-14
**Core Value:** The limited answer budget turns every response into a statement of identity — what you choose to answer reveals what you stand for.

## v5 Requirements

Requirements for Growth & Polish milestone. Each maps to roadmap phases.

### SEO

- [x] **SEO-01**: All public pages have unique meta titles and descriptions
- [x] **SEO-02**: Question and answer pages include JSON-LD structured data (Article schema)
- [x] **SEO-03**: Dynamic sitemap.xml includes all published questions, expert profiles, and topic pages
- [x] **SEO-04**: All pages have canonical URLs to prevent duplicate content
- [x] **SEO-05**: robots.txt allows crawlers on public pages and blocks admin/dashboard routes

### Analytics

- [x] **ANLY-01**: Vercel Analytics is integrated and tracking page views and Web Vitals
- [x] **ANLY-02**: Admin can view a dashboard showing DAU, answer submission rates, and expert engagement
- [ ] **ANLY-03**: Admin dashboard shows growth trends (weekly/monthly comparisons)
- [x] **ANLY-04**: Admin can see most popular questions and most active experts

### Performance

- [x] **PERF-01**: All pages score 90+ on Lighthouse performance (LCP < 2.5s, CLS < 0.1)
- [x] **PERF-02**: Images are optimized with next/image and proper sizing/formats
- [x] **PERF-03**: Key pages use loading skeletons instead of blank screens during data fetch

### UX Polish

- [x] **UXP-01**: Error boundaries catch and display friendly error states on all route segments
- [x] **UXP-02**: Empty states guide users to action (no answers yet, no followers, etc.)
- [x] **UXP-03**: Toast notifications confirm user actions (saved, deleted, followed, etc.)
- [x] **UXP-04**: Core interactive elements meet WCAG 2.1 AA accessibility (focus management, ARIA labels, keyboard navigation)

## v4 Requirements (Complete)

See [v4-REQUIREMENTS.md](milestones/v4-REQUIREMENTS.md) for full archive.

## Future Requirements

Deferred to future release. Not in current roadmap.

### Monetization

- **MONET-01**: Premium subscription with enhanced features
- **MONET-02**: Sponsored/partner questions

### Engagement

- **ENGAGE-01**: Milestone achievements (first answer, 10 followers, etc.)

### Content Quality

- **QUAL-01**: AI detection enforcement on answer submission
- **QUAL-02**: Content reporting and moderation tools

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-generated questions | Editorial team curates manually |
| Native mobile apps | Web-first, responsive design covers mobile |
| Gamification (points, badges, leaderboards) | Trivializes expertise |
| Real-time notifications (WebSocket) | Polling/page-load fetch sufficient at beta scale |
| Infinite comment threading | One level deep keeps discussions readable |
| Milestone achievements | Build when user base is large enough |
| Full WCAG AAA compliance | AA is the practical standard; AAA is aspirational |
| Custom analytics platform | Vercel Analytics + custom admin dashboard is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEO-01 | Phase 17 | Complete |
| SEO-02 | Phase 17 | Complete |
| SEO-03 | Phase 17 | Complete |
| SEO-04 | Phase 17 | Complete |
| SEO-05 | Phase 17 | Complete |
| ANLY-01 | Phase 20 | Complete |
| ANLY-02 | Phase 20 | Complete |
| ANLY-03 | Phase 20 | Pending |
| ANLY-04 | Phase 20 | Complete |
| PERF-01 | Phase 18 | Complete |
| PERF-02 | Phase 18 | Complete |
| PERF-03 | Phase 18 | Complete |
| UXP-01 | Phase 19 | Complete |
| UXP-02 | Phase 19 | Complete |
| UXP-03 | Phase 19 | Complete |
| UXP-04 | Phase 19 | Complete |

**Coverage:**
- v5 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after roadmap creation*
