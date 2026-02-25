# v1 Roadmap Archive — Ethos

**Milestone:** v1 (beta launch)
**Completed:** 2026-02-25
**Phases:** 5 | **Plans:** 15 | **Requirements:** 38 | **Commits:** 14

## Stats

- **Files changed:** 174 (20,915 insertions, 9,845 deletions)
- **Migrations:** 6 SQL files
- **Routes:** 18 (public pages, admin, API)
- **Verification:** 37/38 PASS, 0 FAIL, 1 MANUAL (deployment)
- **Integration:** 18/18 cross-phase points verified

## Key Accomplishments

1. **Platform pivot:** Replaced Tauri desktop journaling app with Next.js 16 + Supabase multi-user web platform
2. **Answer budget enforcement:** Three-layer system (client UX → Server Action → Postgres advisory lock) prevents race conditions
3. **Editorial admin panel:** Question CRUD, queue dashboard with gap detection, answer moderation with soft-hide
4. **Social distribution:** Dynamic OG image generation, enriched metadata on all content pages, ShareButton
5. **Account lifecycle:** OAuth sign-in (Google + LinkedIn OIDC), profile auto-creation, GDPR-ready deletion with full cascade
6. **Expert identity:** Public profiles with selectivity metrics, answer archives, shareable URLs

## Phase Summary

| Phase | Name | Plans | Requirements | Commits |
|-------|------|-------|-------------|---------|
| 1 | Foundation | 3 | AUTH-01–05, PROF-01, INFR-01–02 (8) | 3d76fad |
| 2 | Core Loop | 3 | QUES-01–04, ANS-01–08, FEED-01,03,04 (15) | 6c019a8 |
| 3 | Expert Identity | 3 | PROF-02–05, FEED-02 (5) | 7e92927 |
| 4 | Admin Panel | 4 | ADMN-01–06 (6) | 9569af0 |
| 5 | Distribution | 2 | ANS-05, QUES-04, FEED-05, INFR-03–05 (6) | a35bca1 |

## Phase Details

### Phase 1: Foundation
**Goal:** Establish project scaffolding, database schema, authentication, and deployment pipeline.
- Next.js 16 + App Router + Tailwind CSS v4 + Supabase SSR
- 3 core tables (profiles, questions, answers) with full RLS
- LinkedIn OIDC + Google OAuth via Supabase Auth
- Profile auto-creation trigger (handle_new_user)
- Middleware: protected route redirects + admin role enforcement

### Phase 2: Core Loop
**Goal:** Build the daily question-to-answer-to-feed cycle.
- Homepage with today's question + answers (Server Component, publish_date based)
- Question archive, individual question pages, answer detail pages
- AnswerForm with three-layer budget enforcement + draft auto-save
- submit_answer() Postgres function with pg_advisory_xact_lock
- Markdown rendering via react-markdown, "chose to answer" signal
- All feeds publicly readable (RLS SELECT for anon)

### Phase 3: Expert Identity
**Goal:** Give experts editable profiles with public answer archives.
- Profile editing: headline, bio, organization (Server Action + EditProfileForm)
- Public profile page /expert/[handle] with answer archive
- Dashboard with stats: budget used, selectivity %, total answers
- Expert linking in AnswerCard across all feed pages

### Phase 4: Admin Panel
**Goal:** Build editorial tools for question curation and answer moderation.
- Question CRUD: create, edit, delete (blocks published deletion)
- Queue dashboard: stats, depth indicator, gap detection, upcoming queue
- Queue management: reschedule by changing publish dates
- Answer moderation: hidden_at/hidden_by soft-hide with tightened RLS
- Multi-editor: role-based access (profiles.role = 'admin')

### Phase 5: Distribution
**Goal:** Make content shareable and add launch-readiness features.
- OG meta enrichment on all content pages (questions, answers, profiles)
- /api/og edge route for dynamic 1200x630 social card images
- Viewport metadata, metadataBase, title template
- Mobile responsive grids (single column on mobile)
- ShareButton (copy URL to clipboard)
- Account deletion: admin client + cascade (auth → profiles → answers)
- Privacy policy + Terms of Service pages
- Site footer with legal links

## Migration Chain

| # | File | Purpose |
|---|------|---------|
| 1 | 00001_initial_schema.sql | Tables, indexes, triggers |
| 2 | 00002_rls_policies.sql | RLS on all 3 tables |
| 3 | 00003_submit_answer_function.sql | Advisory lock budget enforcement |
| 4 | 00004_profile_fields.sql | headline, organization columns |
| 5 | 00005_answer_moderation.sql | hidden_at/hidden_by, updated RLS |
| 6 | 00006_created_by_set_null.sql | Fix questions.created_by FK cascade |

## Tech Debt Carried Forward

- No Markdown preview in AnswerForm (renders correctly after submission)
- Admin middleware check adds DB query per request (cache role in JWT claims later)
- No custom error boundary components (Next.js defaults)
- No rate limiting on Server Actions (Supabase handles connection limits)
- REQUIREMENTS.md traceability table not updated (cosmetic)

---
*Archived: 2026-02-25*
