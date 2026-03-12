# Roadmap: Ethos

## v1 — Beta Launch (Complete)

5 phases, 15 plans, 38 requirements. See [v1-ROADMAP.md](milestones/v1-ROADMAP.md) for full archive.

---

## v2 — Engagement & Retention (Complete)

4 phases, 10 plans, 24 requirements. See [v2-ROADMAP.md](milestones/v2-ROADMAP.md) for full archive.

---

## v3 — Discovery & Content Organization

**Goal:** Make every answer findable -- by topic, by search, by quality signal -- so users always have a reason to browse.

### Phases

- [x] **Phase 10: Topic Taxonomy & Browse** - Admin-managed topic tags on questions with user-facing browse and follow (completed 2026-02-28)
- [x] **Phase 11: Search** - Full-text search across questions, answers, and experts with filters and typeahead (completed 2026-02-28)
- [x] **Phase 12: Content Surfacing** - Trending answers, question archives, and related content connections (completed 2026-03-12)
- [ ] **Phase 13: Expert Directory** - Browsable expert directory with auto-generated topic expertise and featured spotlight

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
**Plans**: 2 plans

Plans:
- [ ] 10-01-PLAN.md — Database schema + admin topic management + topic assignment on questions + topic pills on cards
- [ ] 10-02-PLAN.md — Topic browse pages + follow/unfollow + homepage feed personalization

#### Phase 11: Search
**Goal**: Users can find any question, answer, or expert through a single search experience
**Depends on**: Phase 10 (topic taxonomy enables "filter by topic" in search results)
**Requirements**: SRCH-01, SRCH-02, SRCH-03
**Success Criteria** (what must be TRUE):
  1. User can type a query into a search bar accessible from any page and see results spanning questions, answers, and expert profiles
  2. User can narrow search results by content type (question/answer/expert), by topic tag, and by date range
  3. User sees relevant typeahead suggestions after typing 2+ characters, and can select a suggestion to navigate directly
  4. Search results are ranked by relevance and display enough context (snippets, highlights) to evaluate matches without clicking through
**Plans**: TBD

Plans:
- [ ] 11-01: TBD
- [ ] 11-02: TBD

#### Phase 12: Content Surfacing
**Goal**: Users encounter high-quality and relevant content without searching -- the platform surfaces what matters
**Depends on**: Phase 10 (topics for categorization), Phase 11 (search infrastructure may inform ranking)
**Requirements**: SURF-01, SURF-02, SURF-03
**Success Criteria** (what must be TRUE):
  1. User sees a trending section on the homepage showing recent answers ranked by engagement (views, bookmarks), updated regularly
  2. User can browse past questions (beyond today's question) and see all answers submitted for each, organized chronologically
  3. On any answer page, user sees "more from this expert" linking to the expert's other answers, and "other answers to this question" linking to peer responses
**Plans**: 2 plans

Plans:
- [ ] 12-01-PLAN.md — Trending homepage section + question archive enhancements
- [ ] 12-02-PLAN.md — Related content sections on answer pages (more from expert + other perspectives)

#### Phase 13: Expert Directory
**Goal**: Users can discover experts by topic, activity, and editorial curation
**Depends on**: Phase 10 (topic tags power auto-generated expertise labels)
**Requirements**: EXPR-01, EXPR-02, EXPR-03
**Success Criteria** (what must be TRUE):
  1. User can browse a dedicated expert directory page and sort/filter experts by answer count, selectivity score, recent activity, and topic
  2. Each expert profile displays auto-generated topic expertise tags derived from which topics they have answered, reflecting their actual focus areas
  3. Admin can select an expert for a rotating homepage spotlight, and that featured expert appears prominently to all users
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — Expert directory page with sort/filter + auto-generated topic expertise tags on cards and profiles
- [ ] 13-02-PLAN.md — Admin featured expert selection + homepage spotlight section

### Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 10. Topic Taxonomy & Browse | 2/2 | Complete    | 2026-02-28 |
| 11. Search | 2/2 | Complete    | 2026-02-28 |
| 12. Content Surfacing | 2/2 | Complete    | 2026-03-12 |
| 13. Expert Directory | 0/2 | Planning complete | - |

---

*Last updated: 2026-03-11*
