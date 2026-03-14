# Roadmap: Ethos

## v1 — Beta Launch (Complete)

5 phases, 15 plans, 38 requirements. See [v1-ROADMAP.md](milestones/v1-ROADMAP.md) for full archive.

---

## v2 — Engagement & Retention (Complete)

4 phases, 10 plans, 24 requirements. See [v2-ROADMAP.md](milestones/v2-ROADMAP.md) for full archive.

---

## v3 — Discovery & Content Organization (Complete)

4 phases, 8 plans, 12 requirements. See [v3-ROADMAP.md](milestones/v3-ROADMAP.md) for full archive.

<details>
<summary>v3 Phase Details (Phases 10-13)</summary>

### Phase Details

#### Phase 10: Topic Taxonomy & Browse
**Goal**: Users can discover content through a structured topic system that organizes all questions
**Depends on**: v2 complete (phases 6-9)
**Requirements**: TOPC-01, TOPC-02, TOPC-03
**Success Criteria** (what must be TRUE):
  1. Admin can assign 1-3 topic tags to any question from a managed list of topics, and those tags persist across page loads
  2. User can navigate to a topic page and see all questions (with their answers) tagged under that topic
  3. User can follow/unfollow topics from the topic page or a topic listing, and their feed reflects followed-topic preferences
  4. Topic tags appear on question cards throughout the app (homepage, feeds, answer pages)
**Plans**: 2/2 complete

#### Phase 11: Search
**Goal**: Users can find any question, answer, or expert through a single search experience
**Depends on**: Phase 10 (topic taxonomy enables "filter by topic" in search results)
**Requirements**: SRCH-01, SRCH-02, SRCH-03
**Success Criteria** (what must be TRUE):
  1. User can type a query into a search bar accessible from any page and see results spanning questions, answers, and expert profiles
  2. User can narrow search results by content type (question/answer/expert), by topic tag, and by date range
  3. User sees relevant typeahead suggestions after typing 2+ characters, and can select a suggestion to navigate directly
  4. Search results are ranked by relevance and display enough context (snippets, highlights) to evaluate matches without clicking through
**Plans**: 2/2 complete

#### Phase 12: Content Surfacing
**Goal**: Users encounter high-quality and relevant content without searching -- the platform surfaces what matters
**Depends on**: Phase 10 (topics for categorization), Phase 11 (search infrastructure may inform ranking)
**Requirements**: SURF-01, SURF-02, SURF-03
**Success Criteria** (what must be TRUE):
  1. User sees a trending section on the homepage showing recent answers ranked by engagement (views, bookmarks), updated regularly
  2. User can browse past questions (beyond today's question) and see all answers submitted for each, organized chronologically
  3. On any answer page, user sees "more from this expert" linking to the expert's other answers, and "other answers to this question" linking to peer responses
**Plans**: 2/2 complete

#### Phase 13: Expert Directory
**Goal**: Users can discover experts by topic, activity, and editorial curation
**Depends on**: Phase 10 (topic tags power auto-generated expertise labels)
**Requirements**: EXPR-01, EXPR-02, EXPR-03
**Success Criteria** (what must be TRUE):
  1. User can browse a dedicated expert directory page and sort/filter experts by answer count, selectivity score, recent activity, and topic
  2. Each expert profile displays auto-generated topic expertise tags derived from which topics they have answered, reflecting their actual focus areas
  3. Admin can select an expert for a rotating homepage spotlight, and that featured expert appears prominently to all users
**Plans**: 2/2 complete

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Topic Taxonomy & Browse | 2/2 | Complete | 2026-02-28 |
| 11. Search | 2/2 | Complete | 2026-02-28 |
| 12. Content Surfacing | 2/2 | Complete | 2026-03-12 |
| 13. Expert Directory | 2/2 | Complete | 2026-03-11 |

</details>

---

## v4 — Social & Engagement (Complete)

3 phases, 5 plans, 15 requirements. See [v4-REQUIREMENTS.md](milestones/v4-REQUIREMENTS.md) for full archive.

<details>
<summary>v4 Phase Details (Phases 14-16)</summary>

### Phase Details

#### Phase 14: Comments
**Goal**: Experts and invited users can have focused discussions on any answer
**Depends on**: v3 complete (phases 10-13)
**Requirements**: CMNT-01, CMNT-02, CMNT-03, CMNT-04, CMNT-05
**Success Criteria** (what must be TRUE):
  1. An expert can post a comment on any answer and see it appear immediately below the answer
  2. An invited (non-expert) user can post a comment on any answer alongside expert comments
  3. A user can reply to any existing comment, and the reply appears indented one level beneath the parent comment
  4. A user can delete their own comment, and it disappears from the thread
  5. A visitor who is not logged in (or not invited) can read all comments on an answer but sees no input field to post
**Plans**: 1/1 complete

#### Phase 15: Follow Experts
**Goal**: Users can curate which experts they hear from and see a feed shaped by those choices
**Depends on**: Phase 14 (comments establish social interactions; follow builds on that social layer)
**Requirements**: FLLW-01, FLLW-02, FLLW-03
**Success Criteria** (what must be TRUE):
  1. User can follow or unfollow an expert from the expert's profile page or the expert directory, and the action persists across sessions
  2. User's homepage feed shows answers from followed experts before other answers, without hiding unfollowed content
  3. User can navigate to a dedicated page listing all experts they follow, with links to each expert's profile
**Plans**: 2/2 complete

#### Phase 16: Notifications
**Goal**: Users stay informed about activity that matters to them without having to check manually
**Depends on**: Phase 14 (comment events), Phase 15 (follow events)
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07
**Success Criteria** (what must be TRUE):
  1. User sees an unread count badge on the notifications icon and can open the existing notifications page to see new-comment, new-follower, comment-reply, followed-expert-posted, and featured-answer notifications
  2. When a followed expert posts a new answer, the user receives an in-app notification linking to that answer
  3. User receives email digests for notification types they have opted into, delivered via the existing Resend cron infrastructure
  4. User can visit a notification preferences page and toggle each notification type (comments, follows, followed-expert posts, featured) on or off independently for both in-app and email channels
**Plans**: 2/2 complete

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 14. Comments | 1/1 | Complete | 2026-03-12 |
| 15. Follow Experts | 2/2 | Complete | 2026-03-12 |
| 16. Notifications | 2/2 | Complete | 2026-03-12 |

</details>

---

## v5 — Growth & Polish

**Goal:** Make the platform discoverable, measurable, and fast -- so it's ready for real growth beyond the initial beta cohort.

### Phases

- [x] **Phase 17: SEO** - Search engines can discover and richly index all public content (completed 2026-03-14)
- [ ] **Phase 18: Performance** - All pages load fast with optimized assets and Core Web Vitals scores
- [ ] **Phase 19: UX Polish** - Error states, empty states, action feedback, and accessibility create a reliable experience
- [ ] **Phase 20: Analytics** - Admin can measure platform health and growth through integrated analytics

### Phase Details

#### Phase 17: SEO
**Goal**: Search engines can discover, crawl, and richly index every public page on the platform
**Depends on**: v4 complete (phases 14-16)
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05
**Success Criteria** (what must be TRUE):
  1. Every public page (question, answer, expert profile, topic) renders a unique meta title and description visible in browser tabs and search result previews
  2. Question and answer pages include JSON-LD structured data that passes Google's Rich Results Test
  3. Visiting /sitemap.xml returns a valid sitemap listing all published questions, expert profiles, and topic pages -- and it updates as new content is added
  4. Every page has a canonical URL in the `<head>`, and no duplicate URLs appear in search indexes
  5. Visiting /robots.txt shows crawlers allowed on public routes and blocked from /admin and /dashboard paths
**Plans**: 2 plans
- [ ] 17-01-PLAN.md — Meta titles, descriptions, canonical URLs, and robots.txt verification
- [ ] 17-02-PLAN.md — JSON-LD structured data on question/answer pages and sitemap enhancements

#### Phase 18: Performance
**Goal**: Every page loads fast with optimized images, minimal layout shift, and visible loading states
**Depends on**: v4 complete (phases 14-16); independent of Phase 17
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. All key pages (homepage, question, answer, expert profile) score 90+ on Lighthouse performance with LCP under 2.5s and CLS under 0.1
  2. All images use next/image with appropriate sizing, lazy loading, and modern formats (WebP/AVIF)
  3. Users see content-shaped skeleton placeholders instead of blank screens while data loads on the homepage, question feed, and expert directory
**Plans**: TBD

#### Phase 19: UX Polish
**Goal**: Users encounter clear feedback at every interaction -- errors are handled gracefully, empty states guide action, and the interface is accessible
**Depends on**: Phase 18 (skeleton patterns established in Phase 18 inform loading UX consistency)
**Requirements**: UXP-01, UXP-02, UXP-03, UXP-04
**Success Criteria** (what must be TRUE):
  1. When a page or component fails to load, users see a friendly error message with a retry option instead of a blank screen or crash
  2. Pages with no content (no answers yet, no followers, no bookmarks) show contextual guidance pointing users to a next action
  3. After completing actions (saving an answer, following an expert, deleting a comment), users see a brief toast notification confirming what happened
  4. All interactive elements (buttons, links, form controls) have visible focus indicators, ARIA labels, and work with keyboard-only navigation
**Plans**: TBD

#### Phase 20: Analytics
**Goal**: Admin can see how the platform is performing and where growth is happening
**Depends on**: Phase 18 (performance baseline established before measuring)
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04
**Success Criteria** (what must be TRUE):
  1. Vercel Analytics script is loaded on all pages, and page views and Web Vitals data appear in the Vercel dashboard
  2. Admin can visit an analytics page showing daily active users, answer submission rates, and expert engagement metrics
  3. Admin dashboard displays weekly and monthly comparison charts showing growth trends over time
  4. Admin can see a ranked list of most popular questions (by views/answers) and most active experts (by answer count/engagement)
**Plans**: TBD

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 17. SEO | 2/2 | Complete    | 2026-03-14 |
| 18. Performance | 0/? | Not started | - |
| 19. UX Polish | 0/? | Not started | - |
| 20. Analytics | 0/? | Not started | - |

---

*Last updated: 2026-03-14 -- v5 roadmap created*
