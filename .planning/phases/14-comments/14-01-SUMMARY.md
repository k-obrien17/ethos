---
phase: 14-comments
plan: 01
subsystem: api, ui
tags: [supabase, comments, threading, auth, rls]

# Dependency graph
requires:
  - phase: 13-expert-directory
    provides: Profile and auth infrastructure
provides:
  - Hardened addComment with profile verification
  - CommentSection UI with full requirement coverage (post, reply, delete, read-only)
affects: [15-follow-experts, 16-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Defense-in-depth profile check in server actions

key-files:
  created: []
  modified:
    - src/app/actions/comments.js
    - src/components/CommentSection.jsx

key-decisions:
  - "Added profile existence check as defense-in-depth in addComment (prevents bypass of invite flow)"
  - "Allowed self-reply on comments (users may want to add follow-ups to their own comments)"

patterns-established:
  - "Server action profile verification: check profiles table after auth for invite-gated features"

requirements-completed: [CMNT-01, CMNT-02, CMNT-03, CMNT-04, CMNT-05]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 14 Plan 01: Comments Summary

**Hardened comment server action with profile verification and verified full CMNT requirement coverage in existing UI**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T18:09:28Z
- **Completed:** 2026-03-12T18:11:01Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added defense-in-depth profile existence check to addComment server action, preventing comment posting by users who bypassed the invite flow
- Verified all 5 CMNT requirements are satisfied by existing CommentSection component
- Enabled self-reply on comments so users can add follow-ups to their own comments

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden addComment with profile verification** - `d4e6eb8` (feat)
2. **Task 2: Verify CommentSection UI covers all requirement scenarios** - `3c09aef` (feat)

## Files Created/Modified
- `src/app/actions/comments.js` - Added profile existence check after auth in addComment
- `src/components/CommentSection.jsx` - Removed user_id exclusion from Reply button condition

## Decisions Made
- Added profile existence check as defense-in-depth in addComment: even with RLS on the table, an explicit server-side check prevents edge cases where a user has a valid Supabase auth token but no profile row
- Allowed self-reply: the original code hid the Reply button on own comments, but users legitimately may want to add follow-ups

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Comment system fully verified against all 5 CMNT requirements
- Ready for Phase 15 (Follow Experts) which builds social layer on top of comments
- Notification infrastructure (already exists from v2) will integrate with comments in Phase 16

---
*Phase: 14-comments*
*Completed: 2026-03-12*
