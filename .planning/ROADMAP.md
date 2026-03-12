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

## v4 — Social & Engagement

**Goal:** Make the platform feel alive -- experts discuss each other's answers, users follow experts they admire, and everyone gets notified when something they care about happens.

### Phases

- [x] **Phase 14: Comments** - Experts and invited users can discuss answers with one-level threading
- [x] **Phase 15: Follow Experts** - Users follow experts and get a personalized feed (completed 2026-03-12)
- [x] **Phase 16: Notifications** - In-app and email notifications for comments, follows, new posts, and featured answers (completed 2026-03-12)

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
**Plans**: TBD

#### Phase 16: Notifications
**Goal**: Users stay informed about activity that matters to them without having to check manually
**Depends on**: Phase 14 (comment events), Phase 15 (follow events)
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06, NOTF-07
**Success Criteria** (what must be TRUE):
  1. User sees an unread count badge on the notifications icon and can open the existing notifications page to see new-comment, new-follower, comment-reply, followed-expert-posted, and featured-answer notifications
  2. When a followed expert posts a new answer, the user receives an in-app notification linking to that answer
  3. User receives email digests for notification types they have opted into, delivered via the existing Resend cron infrastructure
  4. User can visit a notification preferences page and toggle each notification type (comments, follows, followed-expert posts, featured) on or off independently for both in-app and email channels
**Plans**: 2 plans
- [ ] 16-01-PLAN.md — Missing notification types (comment-reply, followed-expert-posted) + feed UI
- [ ] 16-02-PLAN.md — Notification preferences (in-app + email toggles) + email digest cron

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 14. Comments | 1/1 | Complete    | 2026-03-12 |
| 15. Follow Experts | 2/2 | Complete    | 2026-03-12 |
| 16. Notifications | 2/2 | Complete   | 2026-03-12 |

---

*Last updated: 2026-03-12 -- Phase 16 planned*
