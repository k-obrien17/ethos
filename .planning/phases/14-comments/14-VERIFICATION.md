---
phase: 14-comments
verified: 2026-03-12T18:30:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 14: Comments Verification Report

**Phase Goal:** Experts and invited users can have focused discussions on any answer
**Verified:** 2026-03-12T18:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | An expert (authenticated user with a profile) can post a comment on any answer and see it appear immediately | VERIFIED | `addComment` in `comments.js` checks auth + profile existence, inserts to `answer_comments`, calls `revalidatePath` for immediate re-render. `CommentSection` shows form when `currentUserId` is truthy. |
| 2  | An invited non-expert user can post a comment on any answer alongside expert comments | VERIFIED | Auth model confirmed in PLAN: all users are either `role='user'` or `role='admin'`. Profile check (`profiles` table) is the only gate — no separate expert flag. Same form renders for any authenticated user. |
| 3  | A user can reply to any existing comment and the reply appears indented one level beneath the parent | VERIFIED | `CommentSection.jsx` line 33: Reply button shown when `currentUserId` is truthy (no exclusions). `handleReply` sets `replyTo` state, injects `<input type="hidden" name="parentId">` into form. Replies rendered at `ml-8 mt-2` indentation via `repliesMap` grouping. `parent_id` column added by migration `00020_comment_replies.sql`. |
| 4  | A user can delete their own comment and it disappears from the thread | VERIFIED | `CommentSection.jsx` line 41: Delete button rendered only when `currentUserId === comment.user_id`. `handleDelete` does optimistic removal from `localComments`, calls `deleteComment(commentId, answerId)`, rolls back on error. `deleteComment` in `comments.js` uses `.eq('user_id', user.id)` — enforced at server action AND RLS level. |
| 5  | A visitor who is not logged in or not invited can read all comments but sees no input field to post | VERIFIED | `CommentSection.jsx` lines 162-196: form rendered only when `currentUserId` is truthy; else renders `<p><Link href="/login">Sign in</Link> to comment.</p>`. Comments list rendered regardless. RLS policy `"Anyone can view comments"` uses `USING (true)`. |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/CommentSection.jsx` | Comment UI with threading, reply, delete, and auth-gated input | VERIFIED | 205 lines. Full implementation: expand/collapse toggle, `topLevel`+`repliesMap` thread structure, `CommentItem` sub-component, form with `useActionState(addComment)`, optimistic delete with rollback, auth-conditional form/sign-in prompt. |
| `src/app/actions/comments.js` | Server actions for addComment and deleteComment with auth + profile verification | VERIFIED | 95 lines. `addComment`: auth check, profile existence check, rate limit (30/15min), body validation, Supabase insert, increment RPC, notification fire-and-forget, revalidation. `deleteComment`: auth check, `.eq('user_id', user.id)` guard, decrement RPC, revalidation. |
| `supabase/migrations/00015_answer_comments.sql` | answer_comments table with RLS | VERIFIED | Table with UUID PK, `answer_id`, `user_id`, `body` (1-2000 chars), `created_at`. RLS: public SELECT, auth INSERT, own DELETE. RPCs: `increment_comment_count`, `decrement_comment_count`. |
| `supabase/migrations/00020_comment_replies.sql` | parent_id column for threading | VERIFIED | `ALTER TABLE` adds `parent_id UUID REFERENCES answer_comments(id) ON DELETE CASCADE` + index. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/CommentSection.jsx` | `src/app/actions/comments.js` | `useActionState(addComment)` and `deleteComment()` calls | WIRED | Line 6: `import { addComment, deleteComment } from '@/app/actions/comments'`. Line 61: `useActionState(addComment, null)`. Line 84: `await deleteComment(commentId, answerId)`. Both imported and actively called. |
| `src/app/actions/comments.js` | `answer_comments` table | Supabase insert/delete with RLS | WIRED | Line 34: `supabase.from('answer_comments').insert(...)`. Line 74: `supabase.from('answer_comments').delete().eq('id', commentId).eq('user_id', user.id)`. Results checked, RPCs called after operations. |
| `src/components/AnswerCard.jsx` | `src/components/CommentSection.jsx` | CommentSection rendered inside AnswerCard with answerId, comments, currentUserId props | WIRED | Line 8: `import CommentSection from '@/components/CommentSection'`. Lines 249-253: rendered with all three required props (`answerId={answer.id}`, `comments={comments}`, `currentUserId={currentUserId}`). |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| CMNT-01 | Expert can post a comment on any answer | SATISFIED | Auth + profile check in `addComment`; form shown when `currentUserId` truthy in `CommentSection`. Any user with a profile row qualifies. |
| CMNT-02 | Invited user can post a comment on any answer | SATISFIED | Auth model has no separate expert gate — profile existence is the invite proxy. Same code path as CMNT-01. |
| CMNT-03 | User can reply to a comment (one level deep) | SATISFIED | `parentId` hidden field injected on reply; replies rendered in `repliesMap` at `ml-8 mt-2`. `parent_id` FK exists in DB. One level enforced by UI design (replies only rendered one level deep). |
| CMNT-04 | User can delete their own comment | SATISFIED | Delete button gated on `currentUserId === comment.user_id`; server enforces same via `.eq('user_id', user.id)`. Optimistic UI with rollback. |
| CMNT-05 | Unauthenticated/uninvited users see comments but cannot post | SATISFIED | Public RLS SELECT policy; UI renders sign-in link instead of form when `currentUserId` is falsy. |

No orphaned requirements — all 5 CMNT requirements are claimed by this phase and satisfied.

---

### Anti-Patterns Found

None. No TODO/FIXME/PLACEHOLDER markers, no empty implementations, no stub returns. The two `placeholder` attribute occurrences in `CommentSection.jsx` (lines 179, 181) are standard HTML input placeholder text, not code anti-patterns.

---

### Commit Verification

Both commits documented in SUMMARY.md are confirmed present in git history:

- `d4e6eb8` — `feat(14-01): harden addComment with profile verification`
- `3c09aef` — `feat(14-01): allow replying to own comments in CommentSection`

---

### Human Verification Required

#### 1. Comment appearance after posting

**Test:** Sign in as an authenticated user, navigate to any answer with comments visible, post a comment.
**Expected:** Comment appears in the thread immediately without full page reload.
**Why human:** `revalidatePath` triggers Next.js server-side re-render; optimistic client state not used for add (only for delete). Visual confirmation that the comment appears and the count updates requires running the app.

#### 2. Reply indentation renders correctly

**Test:** Post a reply to an existing comment. Confirm the reply appears visually indented beneath the parent.
**Expected:** Reply shows at `ml-8` (32px left indent) below the parent comment, not at root level.
**Why human:** CSS rendering of indentation cannot be verified programmatically.

#### 3. Unauthenticated state shows read-only view

**Test:** Open an answer page while logged out. Expand the comment section.
**Expected:** All existing comments are visible; no text input or Post button is shown; a "Sign in to comment" link is displayed.
**Why human:** Requires browser session state to confirm the conditional render branch.

---

### Gaps Summary

No gaps. All 5 truths verified, all 4 artifacts verified at all three levels (exists, substantive, wired), all 3 key links confirmed wired, all 5 CMNT requirements satisfied. Phase goal achieved.

---

_Verified: 2026-03-12T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
