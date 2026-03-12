---
phase: 16-notifications
plan: 01
subsystem: api
tags: [notifications, supabase, server-actions, comment-reply, follows]

requires:
  - phase: 14-comments
    provides: "Comment threading (parent_id) and answer_comments table"
  - phase: 15-follow-experts
    provides: "Follows table and follow/unfollow actions"
provides:
  - "comment_reply notification type triggered on reply to another user's comment"
  - "followed_expert_posted notification type triggered when followed expert submits answer"
  - "NotificationFeed UI rendering all 5 notification types"
affects: [notifications, email-digests]

tech-stack:
  added: []
  patterns:
    - "Fire-and-forget notification inserts via .then(() => {})"
    - "Admin client for cross-user notification inserts (bypasses RLS)"
    - "Batch insert for fan-out notifications (followers)"

key-files:
  created:
    - supabase/migrations/00025_notification_types.sql
  modified:
    - src/app/actions/comments.js
    - src/app/actions/answers.js
    - src/components/NotificationFeed.jsx

key-decisions:
  - "Used admin client for follower notifications to bypass RLS on cross-user inserts"
  - "Skip reply notification when parent comment author is the answer author (already gets 'comment' notification)"

patterns-established:
  - "Fan-out notification pattern: query followers, batch insert notifications via admin client"

requirements-completed: [NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05]

duration: 2min
completed: 2026-03-12
---

# Phase 16 Plan 01: Notification Types Summary

**Comment-reply and followed-expert-posted notifications with updated feed UI rendering all 5 types**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T20:13:45Z
- **Completed:** 2026-03-12T20:15:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Migration extends notification type CHECK constraint to support all 5 types
- Reply notifications fire when a user replies to another user's comment (excluding self and answer author who already receives 'comment' type)
- Follower notifications fire as batch insert when an expert submits a new answer
- NotificationFeed displays all 5 types with distinct icons and messages

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration + comment-reply notification** - `cb8dcd5` (feat)
2. **Task 2: Followed-expert-posted notification + feed UI** - `5653006` (feat)

## Files Created/Modified
- `supabase/migrations/00025_notification_types.sql` - Extends CHECK constraint to include comment_reply and followed_expert_posted
- `src/app/actions/comments.js` - Notifies parent comment author on replies
- `src/app/actions/answers.js` - Notifies all followers when expert submits answer
- `src/components/NotificationFeed.jsx` - Icons and messages for comment_reply and followed_expert_posted

## Decisions Made
- Used admin client for follower notification inserts because RLS requires auth.uid() match on insert, which would fail for cross-user notifications
- Skip reply notification when parent comment author is the answer author, since they already receive the 'comment' type notification (avoids duplicate)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - migration must be applied to Supabase (already tracked as a known deployment step).

## Next Phase Readiness
- All 5 notification types now have trigger points and display correctly
- Ready for 16-02 (notification preferences/settings) if planned

---
*Phase: 16-notifications*
*Completed: 2026-03-12*
