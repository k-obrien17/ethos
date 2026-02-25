# v1 Requirements Archive — Ethos

**Milestone:** v1 (beta launch)
**Completed:** 2026-02-25
**Total:** 38 requirements | **Pass:** 37 | **Manual:** 1

## Authentication

- [x] **AUTH-01**: User can sign in with LinkedIn (OpenID Connect)
- [x] **AUTH-02**: User can sign in with Google (OAuth)
- [x] **AUTH-03**: User session persists across browser refresh (cookie-based via @supabase/ssr)
- [x] **AUTH-04**: User is redirected to login when accessing authenticated routes
- [x] **AUTH-05**: Admin role is enforced server-side (middleware + layout checks)

## Profiles

- [x] **PROF-01**: Profile auto-created on first login with name and photo from OAuth provider
- [x] **PROF-02**: User can edit headline, bio, and organization on profile
- [x] **PROF-03**: Public profile page shows answer archive (browse-by-person view)
- [x] **PROF-04**: Profile displays monthly answer count and selectivity ratio
- [x] **PROF-05**: Profile has a shareable URL (/expert/[handle])

## Questions

- [x] **QUES-01**: One curated question publishes per day (publish_date-based, no cron)
- [x] **QUES-02**: Past questions remain browsable in chronological archive
- [x] **QUES-03**: Questions display the count of expert answers
- [x] **QUES-04**: Each question has a shareable URL with OG meta (/q/[slug])

## Answers

- [x] **ANS-01**: Authenticated expert can submit an answer to today's question
- [x] **ANS-02**: Answer budget enforced at three layers: client UX, Server Action, and database (advisory lock)
- [x] **ANS-03**: Visible answer budget display ("2 of 3 remaining this month")
- [x] **ANS-04**: Draft auto-save while composing (survives page navigation)
- [x] **ANS-05**: Each answer has a shareable URL with OG meta (/answers/[id])
- [x] **ANS-06**: Answers render as formatted text (Markdown via react-markdown)
- [x] **ANS-07**: Free tier: 3 answers per month (calendar month reset)
- [x] **ANS-08**: Answers display "X chose to answer" signal on cards

## Feeds

- [x] **FEED-01**: Browse by question — all expert answers under one question
- [x] **FEED-02**: Browse by person — expert's full answer history
- [x] **FEED-03**: Homepage shows today's question with current answers
- [x] **FEED-04**: All content is publicly readable without authentication
- [x] **FEED-05**: OG meta tags and social card previews on answer/question pages

## Admin

- [x] **ADMN-01**: Admin can create questions with category and publish date
- [x] **ADMN-02**: Admin can reorder/reschedule upcoming question queue
- [x] **ADMN-03**: Admin can edit or delete unpublished questions
- [x] **ADMN-04**: Multi-editor support (2-5 editorial team members with admin role)
- [x] **ADMN-05**: Admin can hide/flag published answers (basic moderation)
- [x] **ADMN-06**: Queue dashboard shows depth and upcoming schedule

## Infrastructure

- [ ] **INFR-01**: Deployed on Vercel with automatic previews — *MANUAL: requires live deploy*
- [x] **INFR-02**: Supabase database with RLS policies on all tables
- [x] **INFR-03**: Mobile-responsive design (works on phone via browser)
- [x] **INFR-04**: Account deletion (user can delete profile and all data)
- [x] **INFR-05**: Privacy policy and Terms of Service pages

## Requirement Outcomes

| Outcome | Count | Notes |
|---------|-------|-------|
| Validated (code passes) | 37 | All code-verifiable requirements pass |
| Manual verification needed | 1 | INFR-01 — requires Vercel deployment |
| Adjusted | 0 | — |
| Dropped | 0 | — |

## Design Decisions Made During v1

| Decision | Requirement | Outcome |
|----------|------------|---------|
| Calendar month reset (not rolling window) | ANS-07 | Implemented via date_trunc('month', now()) |
| Soft word guidance, no hard limits | ANS-06 | Min 10 chars enforced, no max word count |
| OAuth avatars only (no upload) | PROF-01 | avatar_url from OAuth metadata |
| /q/[slug] instead of /questions/[id] | QUES-04 | Better URL design, meets intent |
| No Markdown preview in compose | ANS-06 | Renders correctly after submission |
| Answers visible before expert submits | FEED-01 | No anchoring prevention — increases read engagement |

---
*Archived: 2026-02-25*
