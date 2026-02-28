---
phase: 10-topic-taxonomy-browse
plan: 01
subsystem: database, admin, ui
tags: [supabase, rls, topics, taxonomy, junction-table, server-actions, next.js]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: questions table, profiles table, admin layout, Supabase client
provides:
  - topics table with slug-based lookups
  - question_topics junction table (max 3 enforced via trigger)
  - topic_follows table for user subscriptions
  - Server actions for topic CRUD and question-topic assignment
  - Admin topic management page at /admin/topics
  - Topic pill picker in QuestionForm (create and edit)
  - Topic pills rendered on QuestionCard across all public and admin pages
affects: [10-02 topic browse page, 10-02 topic follow/unfollow, 11 search filters by topic]

# Tech tracking
tech-stack:
  added: []
  patterns: [junction table with trigger-enforced max, nested Supabase joins for topic data]

key-files:
  created:
    - supabase/migrations/00012_topics.sql
    - src/app/actions/topics.js
    - src/app/admin/topics/page.jsx
    - src/app/admin/topics/CreateTopicForm.jsx
    - src/app/admin/topics/DeleteTopicButton.jsx
  modified:
    - src/app/admin/layout.jsx
    - src/components/admin/QuestionForm.jsx
    - src/app/actions/questions.js
    - src/app/admin/questions/new/page.jsx
    - src/app/admin/questions/[id]/edit/page.jsx
    - src/app/admin/questions/page.jsx
    - src/components/QuestionCard.jsx
    - src/app/page.jsx
    - src/app/q/[slug]/page.jsx
    - src/app/answers/[id]/page.jsx
    - src/app/questions/page.jsx

key-decisions:
  - "Topic pills are non-interactive display-only on public pages; links come in plan 10-02"
  - "Topic picker uses clickable pill UI with hidden form input (comma-separated UUIDs)"
  - "Topic assignment logic inlined in createQuestion/updateQuestion to avoid circular imports with topics.js"

patterns-established:
  - "Nested Supabase joins: question_topics(topics(name, slug)) for topic data on questions"
  - "Junction table topic assignment: delete-all then insert-new pattern for idempotent updates"
  - "Admin client component pattern: co-located CreateTopicForm.jsx and DeleteTopicButton.jsx in admin route directory"

requirements-completed: [TOPC-01]

# Metrics
duration: 5min
completed: 2026-02-28
---

# Phase 10 Plan 01: Topic Taxonomy Summary

**Admin-managed topic taxonomy with 3-table schema (topics, question_topics, topic_follows), topic picker in question form, and topic pills rendered across all question surfaces**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-28T13:59:35Z
- **Completed:** 2026-02-28T14:04:13Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Created 3-table topic schema with RLS policies, max-3 trigger, and indexes
- Built admin topic management page with create/delete functionality
- Added interactive topic pill picker to question create/edit form (max 3 selections)
- Wired topic data through Supabase nested joins to all question-rendering surfaces
- Topic pills appear on homepage, question page, answer page, questions list, and admin questions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create topic database schema (migration 00012)** - `53f7407` (feat)
2. **Task 2: Admin topic management + question form topic picker + topic pills on cards** - `eb40109` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/00012_topics.sql` - Topics, question_topics, topic_follows tables with RLS and max-3 trigger
- `src/app/actions/topics.js` - Server actions: createTopic, deleteTopic, setQuestionTopics
- `src/app/admin/topics/page.jsx` - Admin topics list page with question counts
- `src/app/admin/topics/CreateTopicForm.jsx` - Client form for creating topics
- `src/app/admin/topics/DeleteTopicButton.jsx` - Client delete button with confirmation
- `src/app/admin/layout.jsx` - Added Topics nav link
- `src/components/admin/QuestionForm.jsx` - Added topic picker with pill toggle UI
- `src/app/actions/questions.js` - Added topic assignment after create/update
- `src/app/admin/questions/new/page.jsx` - Passes topics to QuestionForm
- `src/app/admin/questions/[id]/edit/page.jsx` - Passes topics + selectedTopicIds to QuestionForm
- `src/app/admin/questions/page.jsx` - Joins topics, shows pills in question rows
- `src/components/QuestionCard.jsx` - Renders topic pills from question_topics join
- `src/app/page.jsx` - Joins topics on today's question and recent questions
- `src/app/q/[slug]/page.jsx` - Joins topics, renders pills in question header
- `src/app/answers/[id]/page.jsx` - Joins topics via nested question select, renders pills
- `src/app/questions/page.jsx` - Joins topics for question list

## Decisions Made
- Topic pills are non-interactive (display-only) on public pages; links to topic browse pages come in plan 10-02
- Used clickable pill UI with hidden comma-separated input for form integration (avoids multi-select dropdowns)
- Inlined topic assignment logic in createQuestion/updateQuestion rather than importing from topics.js to avoid circular dependency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
Migration `00012_topics.sql` must be applied to the Supabase database. Run via Supabase CLI or apply manually in the SQL editor.

## Next Phase Readiness
- Topic schema is in place and ready for plan 10-02 (topic browse page, follow/unfollow)
- topic_follows table already created, waiting for UI in next plan
- All question surfaces have topic data available via joins

## Self-Check: PASSED

All 6 created files verified present. Both task commits (53f7407, eb40109) verified in git log.

---
*Phase: 10-topic-taxonomy-browse*
*Completed: 2026-02-28*
