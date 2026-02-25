# Roadmap: Ethos

**Created:** 2026-02-25
**Phases:** 5
**v1 Requirements:** 38 (all mapped)

---

## Phase 1: Foundation

**Goal:** Establish project scaffolding, database schema, authentication, and deployment pipeline so every subsequent phase builds on a working, deployed app.
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, INFR-01, INFR-02

### Deliverables

1. Next.js 15 project initialized with App Router, Tailwind CSS v4, and Supabase client configuration
2. Root layout with fonts (Inter), global styles, warm color palette, environment variables
3. Supabase project with three core tables: `profiles`, `questions`, `answers`
4. RLS policies enabled on all tables (default deny, explicit grants)
5. `profiles` auto-created on signup via database trigger (`handle_new_user`)
6. `answer_limit` column on profiles (default: 3)
7. Unique indexes: `answers(expert_id, question_id)`, `profiles(handle)`, `questions(slug)`
8. Auth flow: LinkedIn OpenID Connect + Google OAuth via Supabase Auth
9. Cookie-based session persistence using `@supabase/ssr`
10. Middleware for protected route redirects (`/admin/*`, `/dashboard/*`)
11. Admin role enforcement: middleware fast-reject + layout server-side check
12. Profile auto-creation on first login (name + avatar from OAuth provider)
13. Deployed to Vercel with automatic preview deployments
14. Supabase migrations checked into repo (`supabase/migrations/`)

### Done When

- [ ] User can sign in with Google OAuth and see a profile record in the database
- [ ] User can sign in with LinkedIn OIDC and see a profile record in the database
- [ ] Session persists across browser refresh (no re-login required)
- [ ] Unauthenticated user is redirected to login when hitting `/dashboard`
- [ ] Non-admin user is redirected away from `/admin` routes
- [ ] RLS policies block direct Supabase client writes from unauthenticated users
- [ ] App is live on Vercel with working preview deploys on PR branches
- [ ] Database schema matches ARCHITECTURE.md Section 8

---

## Phase 2: Core Loop

**Goal:** Build the daily question-to-answer-to-feed cycle — the product's central mechanic — so experts can answer questions within their budget and anyone can browse answers.
**Requirements:** QUES-01, QUES-02, QUES-03, QUES-04, ANS-01, ANS-02, ANS-03, ANS-04, ANS-05, ANS-06, ANS-07, ANS-08, FEED-01, FEED-03, FEED-04

### Deliverables

1. Question display: today's question on homepage (Server Component, `publish_date = CURRENT_DATE`)
2. Past question archive: chronological list of all published questions with answer counts
3. Individual question page (`/questions/[id]`) with all expert answers listed below
4. Answer submission form (Client Component) on question page — textarea with Markdown preview
5. Three-layer answer budget enforcement: client UX disable, Server Action count check, Postgres `submit_answer()` advisory lock function
6. Visible budget display: "X of 3 remaining this month" in header and answer form
7. Draft auto-save: composing text persists across page navigation (localStorage or server-side)
8. Answer rendering: Markdown via `react-markdown` with safe defaults
9. "X chose to answer" signal displayed on answer cards
10. Free tier enforcement: 3 answers per calendar month (no reset job — query-time filtering)
11. All feeds publicly readable without authentication (RLS SELECT policies for anon)
12. ISR caching on public feeds with `revalidatePath()` after answer submission

### Done When

- [ ] Today's question appears on homepage at midnight UTC based on `publish_date`
- [ ] Past questions are browsable in chronological archive with answer counts
- [ ] Authenticated expert can submit an answer to today's question
- [ ] Fourth answer in a calendar month is rejected at all three enforcement layers
- [ ] Two simultaneous submissions from the same expert do not both succeed (advisory lock works)
- [ ] Budget display accurately shows remaining answers for the current month
- [ ] Draft text survives page navigation and browser close
- [ ] Answers render Markdown formatting correctly
- [ ] Answer cards show "X chose to answer" signal
- [ ] Question pages are accessible without login
- [ ] Each question has a working shareable URL at `/questions/[id]`

---

## Phase 3: Expert Identity

**Goal:** Give experts editable profiles with public answer archives, enabling the browse-by-person feed that makes selectivity patterns visible.
**Requirements:** PROF-02, PROF-03, PROF-04, PROF-05, FEED-02

### Deliverables

1. Profile editing: headline, bio, and organization fields (Server Action form)
2. Public profile page (`/expert/[slug]`) showing expert info + full answer archive
3. Shareable profile URLs that work when pasted into social platforms
4. Monthly answer count and selectivity ratio displayed on profile (e.g., "Answered 2 of 28 questions this month")
5. Browse-by-person feed: expert's answer history with question context, chronologically ordered
6. Profile page as Server Component for SEO with Client Component edit controls for the profile owner

### Done When

- [ ] Expert can edit headline, bio, and organization from their profile
- [ ] Public profile page renders at `/expert/[slug]` with answer archive
- [ ] Profile URL is shareable and renders correctly for unauthenticated visitors
- [ ] Monthly answer count and selectivity ratio are visible on profile
- [ ] Browse-by-person feed shows all of an expert's answers with linked questions

---

## Phase 4: Admin Panel

**Goal:** Build the editorial tools that let a small team (2-5 editors) curate, schedule, and moderate the daily question queue.
**Requirements:** ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06

### Deliverables

1. Question creation form: body, category, publish date, slug (auto-generated)
2. Question editing and deletion for unpublished/scheduled questions
3. Queue management: reorder upcoming questions by changing publish dates
4. Queue dashboard: calendar or list view showing scheduled questions, queue depth, and gaps
5. Multi-editor support: 2-5 users with `role = 'admin'` can all access the admin panel
6. Basic moderation: admin can hide or flag published answers (soft delete / visibility toggle)

### Done When

- [ ] Admin can create a question with category and publish date
- [ ] Admin can edit or delete questions that haven't been published yet
- [ ] Admin can reorder the queue by reassigning publish dates
- [ ] Queue dashboard shows upcoming schedule with depth indicator
- [ ] Second admin user can log in and access all admin features
- [ ] Admin can hide a published answer (answer no longer visible in public feeds)

---

## Phase 5: Distribution

**Goal:** Make every piece of content shareable on social platforms with rich previews, polish the mobile experience, and add legal/compliance pages for launch readiness.
**Requirements:** ANS-05, QUES-04, FEED-05, INFR-03, INFR-04, INFR-05

### Deliverables

1. OG meta tags on question pages (`generateMetadata` with title, description, image)
2. OG meta tags on answer pages (expert name, question text, answer excerpt)
3. Social card preview generation using `@vercel/og` (ImageResponse at `/api/og`)
4. Share button on questions and answers (copy URL to clipboard)
5. Mobile responsiveness pass: all pages usable on phone-sized screens
6. Privacy policy page (`/privacy`)
7. Terms of Service page (`/terms`)
8. Account deletion flow: user can delete profile and all associated data

### Done When

- [ ] Pasting a question URL into LinkedIn/Twitter shows rich card preview
- [ ] Pasting an answer URL shows expert name and answer excerpt in card
- [ ] OG images generate correctly via `/api/og` endpoint
- [ ] All pages are usable on 375px-wide viewport (iPhone SE)
- [ ] Privacy policy and Terms of Service pages are accessible from footer
- [ ] User can delete their account and all data is removed from the database
- [ ] Shareable answer URLs work at `/answers/[id]`

---

## Phase Summary

| Phase | Name | Requirements | Count |
|-------|------|-------------|-------|
| 1 | Foundation | AUTH-01–05, PROF-01, INFR-01–02 | 8 |
| 2 | Core Loop | QUES-01–04, ANS-01–04, ANS-06–08, FEED-01, FEED-03–04 | 15 |
| 3 | Expert Identity | PROF-02–05, FEED-02 | 5 |
| 4 | Admin Panel | ADMN-01–06 | 6 |
| 5 | Distribution | ANS-05, QUES-04, FEED-05, INFR-03–05 | 6 |
| **Total** | | | **38** (2 shared across phases) |

**Note:** QUES-04 and ANS-05 (shareable URLs) appear in both Phase 2 (basic URL routing) and Phase 5 (OG meta tags and social card previews). The URL structure is built in Phase 2; the social sharing enrichment is completed in Phase 5.

---

## Dependencies Between Phases

```
Phase 1: Foundation
    │
    ▼
Phase 2: Core Loop ──────► Phase 3: Expert Identity
    │                              │
    ▼                              ▼
Phase 4: Admin Panel       Phase 5: Distribution
```

- Phase 2 requires Phase 1 (auth, schema, deployment)
- Phase 3 requires Phase 2 (answers must exist to populate profiles)
- Phase 4 can run in parallel with Phase 3 (admin tools are independent of profile features) but benefits from Phase 2 being complete (questions/answers exist in the system)
- Phase 5 requires Phases 2 and 3 (content and profiles must exist to share)

---
*Roadmap created: 2026-02-25*
