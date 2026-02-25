# Requirements: Ethos

**Defined:** 2026-02-25
**Core Value:** The limited answer budget turns every response into a statement of identity — what you choose to answer reveals what you stand for.

## v1 Requirements

Requirements for beta launch (20-50 real users).

### Authentication

- [ ] **AUTH-01**: User can sign in with LinkedIn (OpenID Connect)
- [ ] **AUTH-02**: User can sign in with Google (OAuth)
- [ ] **AUTH-03**: User session persists across browser refresh (cookie-based via @supabase/ssr)
- [ ] **AUTH-04**: User is redirected to login when accessing authenticated routes
- [ ] **AUTH-05**: Admin role is enforced server-side (middleware + layout checks)

### Profiles

- [ ] **PROF-01**: Profile auto-created on first login with name and photo from OAuth provider
- [ ] **PROF-02**: User can edit headline, bio, and organization on profile
- [ ] **PROF-03**: Public profile page shows answer archive (browse-by-person view)
- [ ] **PROF-04**: Profile displays monthly answer count and selectivity ratio
- [ ] **PROF-05**: Profile has a shareable URL (/expert/[slug])

### Questions

- [ ] **QUES-01**: One curated question publishes per day (publish_date-based, no cron)
- [ ] **QUES-02**: Past questions remain browsable in chronological archive
- [ ] **QUES-03**: Questions display the count of expert answers
- [ ] **QUES-04**: Each question has a shareable URL (/questions/[id])

### Answers

- [ ] **ANS-01**: Authenticated expert can submit an answer to today's question
- [ ] **ANS-02**: Answer budget enforced at three layers: client UX, Server Action, and database (advisory lock)
- [ ] **ANS-03**: Visible answer budget display ("2 of 3 remaining this month")
- [ ] **ANS-04**: Draft auto-save while composing (survives page navigation)
- [ ] **ANS-05**: Each answer has a shareable URL (/answers/[id])
- [ ] **ANS-06**: Answers render as formatted text (Markdown via react-markdown)
- [ ] **ANS-07**: Free tier: 3 answers per month (calendar month reset)
- [ ] **ANS-08**: Answers display "X chose to answer" signal on cards

### Feeds

- [ ] **FEED-01**: Browse by question — all expert answers under one question
- [ ] **FEED-02**: Browse by person — expert's full answer history
- [ ] **FEED-03**: Homepage shows today's question with current answers
- [ ] **FEED-04**: All content is publicly readable without authentication
- [ ] **FEED-05**: OG meta tags and social card previews on answer/question pages

### Admin

- [ ] **ADMN-01**: Admin can create questions with category and publish date
- [ ] **ADMN-02**: Admin can reorder/reschedule upcoming question queue
- [ ] **ADMN-03**: Admin can edit or delete unpublished questions
- [ ] **ADMN-04**: Multi-editor support (2-5 editorial team members with admin role)
- [ ] **ADMN-05**: Admin can hide/flag published answers (basic moderation)
- [ ] **ADMN-06**: Queue dashboard shows depth and upcoming schedule

### Infrastructure

- [ ] **INFR-01**: Deployed on Vercel with automatic previews
- [ ] **INFR-02**: Supabase database with RLS policies on all tables
- [ ] **INFR-03**: Mobile-responsive design (works on phone via browser)
- [ ] **INFR-04**: Account deletion (user can delete profile and all data)
- [ ] **INFR-05**: Privacy policy and Terms of Service pages

## v2 Requirements

Deferred to post-beta validation. Tracked but not in current roadmap.

### Premium Tier

- **PREM-01**: Premium tier with 5+ answers/month
- **PREM-02**: Tiered queue preview (free: 3 days, premium: full month)
- **PREM-03**: Expert analytics dashboard (view counts, reach)
- **PREM-04**: Stripe billing integration

### Engagement

- **ENGM-01**: "Featured answer" editorial pick per question
- **ENGM-02**: Topic/category tagging on questions
- **ENGM-03**: Calendar view of upcoming questions (premium)
- **ENGM-04**: "Remind me" bookmark on future questions
- **ENGM-05**: Answer budget reset notification (email)
- **ENGM-06**: Monthly/yearly answer recap for experts

### Advanced

- **ADVN-01**: Embeddable answer widgets (oEmbed/iframe)
- **ADVN-02**: No-edit-after-publish (or 15-minute edit window)
- **ADVN-03**: Sponsored questions (brand-featured)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Comments/replies on answers | Kills expert participation — experts won't wade into reply threads (Quora's failure mode) |
| Public reactions/upvotes/likes | Creates popularity contest, undermines selectivity signal |
| Algorithmic feed | Chronological + editorial only — algorithmic suppression drives experts away |
| AI answer suggestions | Undermines the entire authenticity premise |
| Follower counts / social graph | Wrong signal — selectivity patterns replace vanity metrics |
| Gamification (points, badges, leaderboards) | Trivializes expertise, encourages gaming over quality |
| User-submitted questions | Quality collapse — editorial curation is the moat |
| Native mobile apps | Web-first, responsive design covers mobile for beta |
| Payments/billing (v1) | Validate core loop before building billing |
| Email/password auth | Social login only — target users live on LinkedIn |
| Real-time features (WebSocket/Realtime) | Unnecessary for daily cadence — adds cost and complexity |
| Notification system | No notification spam — experts set their own rhythm |

## Traceability

Populated: 2026-02-25 (see .planning/ROADMAP.md for phase details)

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | 1 — Foundation | Pending |
| AUTH-02 | 1 — Foundation | Pending |
| AUTH-03 | 1 — Foundation | Pending |
| AUTH-04 | 1 — Foundation | Pending |
| AUTH-05 | 1 — Foundation | Pending |
| PROF-01 | 1 — Foundation | Pending |
| PROF-02 | 3 — Expert Identity | Pending |
| PROF-03 | 3 — Expert Identity | Pending |
| PROF-04 | 3 — Expert Identity | Pending |
| PROF-05 | 3 — Expert Identity | Pending |
| QUES-01 | 2 — Core Loop | Pending |
| QUES-02 | 2 — Core Loop | Pending |
| QUES-03 | 2 — Core Loop | Pending |
| QUES-04 | 2 — Core Loop, 5 — Distribution | Pending |
| ANS-01 | 2 — Core Loop | Pending |
| ANS-02 | 2 — Core Loop | Pending |
| ANS-03 | 2 — Core Loop | Pending |
| ANS-04 | 2 — Core Loop | Pending |
| ANS-05 | 2 — Core Loop, 5 — Distribution | Pending |
| ANS-06 | 2 — Core Loop | Pending |
| ANS-07 | 2 — Core Loop | Pending |
| ANS-08 | 2 — Core Loop | Pending |
| FEED-01 | 2 — Core Loop | Pending |
| FEED-02 | 3 — Expert Identity | Pending |
| FEED-03 | 2 — Core Loop | Pending |
| FEED-04 | 2 — Core Loop | Pending |
| FEED-05 | 5 — Distribution | Pending |
| ADMN-01 | 4 — Admin Panel | Pending |
| ADMN-02 | 4 — Admin Panel | Pending |
| ADMN-03 | 4 — Admin Panel | Pending |
| ADMN-04 | 4 — Admin Panel | Pending |
| ADMN-05 | 4 — Admin Panel | Pending |
| ADMN-06 | 4 — Admin Panel | Pending |
| INFR-01 | 1 — Foundation | Pending |
| INFR-02 | 1 — Foundation | Pending |
| INFR-03 | 5 — Distribution | Pending |
| INFR-04 | 5 — Distribution | Pending |
| INFR-05 | 5 — Distribution | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38 (100%)
- Shared across phases: 2 (QUES-04, ANS-05 — URL routing in Phase 2, OG enrichment in Phase 5)
- Unmapped: 0

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after roadmap creation (traceability table populated)*
