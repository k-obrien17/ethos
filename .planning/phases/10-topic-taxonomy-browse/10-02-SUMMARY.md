---
phase: 10-topic-taxonomy-browse
plan: 02
subsystem: ui, database
tags: [next.js, supabase, topics, follow, feed-personalization, server-actions, server-components]

# Dependency graph
requires:
  - phase: 10-topic-taxonomy-browse
    provides: topics table, question_topics junction, topic_follows table, server actions, topic pills on QuestionCard
provides:
  - /topics listing page with question counts and follow buttons
  - /topics/[slug] detail page with tagged questions
  - Follow/unfollow server actions and FollowTopicButton client component
  - Homepage feed personalization based on followed topics
  - Linked topic pills across all public pages (homepage, question, answer, question list)
affects: [11 search filters by topic, 12 content surfacing, 13 expert directory]

# Tech tracking
tech-stack:
  added: []
  patterns: [optimistic UI with useTransition for follow/unfollow, restructured card to avoid nested anchor tags]

key-files:
  created:
    - src/app/topics/page.jsx
    - src/app/topics/[slug]/page.jsx
    - src/components/FollowTopicButton.jsx
  modified:
    - src/app/actions/topics.js
    - src/components/QuestionCard.jsx
    - src/app/page.jsx
    - src/app/q/[slug]/page.jsx
    - src/app/answers/[id]/page.jsx
    - src/components/Header.jsx

key-decisions:
  - "QuestionCard restructured: outer div wraps Link (question body) + separate topic pill Links to avoid nested anchor tags"
  - "FollowTopicButton uses optimistic useState + useTransition for instant UI feedback"
  - "Feed personalization uses client-side sort (stable sort preserving date order within groups) rather than a separate DB query"

patterns-established:
  - "Optimistic toggle pattern: useState for immediate feedback, useTransition for server action, revert on error"
  - "Card link restructure: div wrapper with Link for main content and separate Link elements for secondary navigation"

requirements-completed: [TOPC-02, TOPC-03]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 10 Plan 02: Topic Browse & Follow Summary

**Topic browse pages (/topics, /topics/[slug]) with follow/unfollow functionality, linked topic pills across all surfaces, and homepage feed personalization for followed topics**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T14:06:44Z
- **Completed:** 2026-02-28T14:09:46Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created /topics listing page with grid layout showing all topics, question counts, follower counts, and follow buttons
- Created /topics/[slug] detail page with topic metadata and tagged questions rendered via QuestionCard
- Built FollowTopicButton client component with optimistic UI and useTransition
- Added followTopic/unfollowTopic server actions with idempotent upsert/delete
- Converted all topic pills across the app from non-interactive spans to linked Links pointing to /topics/[slug]
- Added homepage feed personalization: recent questions with followed topics sort first for signed-in users
- Added Topics nav link to main header

## Task Commits

Each task was committed atomically:

1. **Task 1: Topic listing page, topic detail page, and nav link** - `5c87f0e` (feat)
2. **Task 2: Follow/unfollow topics, linked topic pills, feed personalization** - `240b6ad` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/app/topics/page.jsx` - Topics listing page with grid of topic cards, follow buttons, question/follower counts
- `src/app/topics/[slug]/page.jsx` - Topic detail page with metadata, follower count, and tagged questions
- `src/components/FollowTopicButton.jsx` - Client component: optimistic follow/unfollow toggle with size variants
- `src/app/actions/topics.js` - Extended with followTopic (upsert) and unfollowTopic (delete) server actions
- `src/components/QuestionCard.jsx` - Restructured to avoid nested anchors; topic pills are now Links outside the card Link
- `src/app/page.jsx` - Added followed-topic query, feed personalization sort, linked topic pills on today's question
- `src/app/q/[slug]/page.jsx` - Topic pills converted from spans to linked Links
- `src/app/answers/[id]/page.jsx` - Topic pills converted from spans to linked Links
- `src/components/Header.jsx` - Added Topics nav link

## Decisions Made
- Restructured QuestionCard to use a div wrapper with Link for the card body and separate Link elements for topic pills, avoiding invalid nested anchor HTML
- FollowTopicButton uses optimistic state update (useState flips immediately, useTransition fires server action, reverts on error)
- Feed personalization implemented as a stable client-side sort of already-fetched recent questions, prioritizing followed-topic questions while preserving date order within groups
- Updated topic joins to include topic `id` field for personalization matching

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Linked topic pills on question detail and answer pages**
- **Found during:** Task 2 (topic pill linking)
- **Issue:** Plan focused on QuestionCard and homepage, but question detail page (/q/[slug]) and answer page (/answers/[id]) also had non-interactive topic pills
- **Fix:** Converted topic pill spans to Links on both pages for consistent experience across all surfaces
- **Files modified:** src/app/q/[slug]/page.jsx, src/app/answers/[id]/page.jsx
- **Verification:** Both files now contain Link elements pointing to /topics/[slug]
- **Committed in:** 240b6ad (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for consistent topic navigation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. topic_follows table was already created in plan 10-01 migration.

## Next Phase Readiness
- Topic taxonomy is fully user-facing: browse, follow, personalized feed
- All topic pills are interactive links across all public surfaces
- Ready for Phase 11 (Search) which can add topic-based filtering
- Ready for Phase 12 (Content Surfacing) which can leverage follow data

## Self-Check: PASSED

All 3 created files verified present. Both task commits (5c87f0e, 240b6ad) verified in git log.

---
*Phase: 10-topic-taxonomy-browse*
*Completed: 2026-02-28*
