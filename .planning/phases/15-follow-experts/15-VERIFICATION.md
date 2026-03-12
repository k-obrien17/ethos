---
phase: 15-follow-experts
verified: 2026-03-12T18:45:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 15: Follow Experts Verification Report

**Phase Goal:** Users can curate which experts they hear from and see a feed shaped by those choices
**Verified:** 2026-03-12T18:45:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                              | Status     | Evidence                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | User can follow or unfollow an expert from the expert directory page, and the action persists across sessions      | VERIFIED | `FollowButtonSmall` rendered at line 294 of `experts/page.jsx` inside each expert card; calls `toggleFollow` server action which writes to the `follows` table |
| 2   | User can navigate to /following and see a list of all experts they follow with links to each expert's profile      | VERIFIED | `following/page.jsx` queries `profiles` filtered by `followingIds` (line 46-50), renders "Your Experts" section with `<Link href={/expert/${profile.handle}}>` per card |
| 3   | Authenticated user's homepage feed shows today's answers from followed experts before answers from non-followed experts | VERIFIED | `page.jsx` lines 111-127: `followedExpertIds` Set built from `userMeta[2]`, three-tier sort: featured > followed > chronological |
| 4   | Answers from non-followed experts are still visible — not hidden, only deprioritized                              | VERIFIED | Sort in `page.jsx` does not filter — all answers remain in `todayAnswers`, only reordered |
| 5   | Follow/unfollow action does not navigate away when clicked inside an expert directory card Link                    | VERIFIED | `FollowButtonSmall.jsx` lines 11-12: `e.stopPropagation()` and `e.preventDefault()` called before any state change |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact                               | Expected                                                                      | Status     | Details                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| `src/components/FollowButtonSmall.jsx` | Compact follow/unfollow button for use inside Link wrappers                   | VERIFIED   | 39 lines, `use client`, `useState` + `useTransition`, stopPropagation, optimistic UI |
| `src/app/experts/page.jsx`             | Expert directory with inline follow buttons for authenticated users           | VERIFIED   | Fetches `followedIds` Set, renders `FollowButtonSmall` for authenticated non-self users |
| `src/app/following/page.jsx`           | Following page with expert list section above the recent answers feed         | VERIFIED   | "Your Experts" section at lines 101-133, answer feed below, empty state links to /experts |
| `src/app/page.jsx`                     | Homepage with followed-expert answer prioritization in the today's answers feed | VERIFIED | Third query in `userMeta` parallel batch (line 65-67), `followedExpertIds` Set, updated sort comparator |

---

## Key Link Verification

| From                                   | To                       | Via                                       | Status   | Details                                                                                   |
| -------------------------------------- | ------------------------ | ----------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `src/components/FollowButtonSmall.jsx` | `src/app/actions/follows.js` | `toggleFollow` server action call         | WIRED    | Import at line 4; `toggleFollow(targetUserId)` called inside `startTransition` at line 17 |
| `src/app/experts/page.jsx`             | `FollowButtonSmall.jsx`  | `FollowButtonSmall` rendered in each expert card | WIRED | Import at line 3; component rendered at line 294 with `targetUserId` and `isFollowing` props |
| `src/app/following/page.jsx`           | follows table            | Supabase query joining follows with profiles | WIRED | `from('follows').select('following_id').eq('follower_id', user.id)` at lines 18-21; profiles fetched via `.in('id', followingIds)` at lines 46-50 |
| `src/app/page.jsx`                     | follows table            | Supabase query for user's followed expert IDs | WIRED | `from('follows').select('following_id').eq('follower_id', user.id)` at lines 65-67 inside `userMeta` Promise.all |
| `src/app/page.jsx`                     | answers table            | todayAnswers sort with followed-expert priority | WIRED | `followedExpertIds.has(a.expert_id)` used in sort comparator at lines 121-123 |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                               | Status    | Evidence                                                                                                   |
| ----------- | ----------- | --------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| FLLW-01     | 15-01-PLAN  | User can follow/unfollow an expert from their profile or directory | SATISFIED | `FollowButtonSmall` on expert directory cards + existing `FollowButton` on expert profile pages; both call `toggleFollow` |
| FLLW-02     | 15-02-PLAN  | User's feed prioritizes answers from followed experts     | SATISFIED | Homepage `page.jsx` three-tier sort puts `followedExpertIds` answers before non-followed, non-featured answers |
| FLLW-03     | 15-01-PLAN  | User can view a list of experts they follow               | SATISFIED | `/following` page "Your Experts" section shows all followed profiles with avatar, name, headline, and profile link |

No orphaned requirements — all three FLLW IDs are accounted for across both plans, and REQUIREMENTS.md confirms all are marked complete for Phase 15.

---

## Anti-Patterns Found

None. No TODO/FIXME/placeholder markers, no stub returns, no empty implementations in any of the four files modified by this phase.

---

## Human Verification Required

### 1. Follow button stopPropagation in browser

**Test:** On the `/experts` page as a signed-in user, click the "Follow" button on any expert card.
**Expected:** The follow state toggles (button changes to "Following"), and the page does NOT navigate to the expert's profile.
**Why human:** `e.stopPropagation()` behavior inside a Next.js `<Link>` requires a live browser to confirm the navigation is actually suppressed.

### 2. Follow state persistence across sessions

**Test:** Follow an expert from the directory, close the browser, reopen, and navigate back to `/experts`.
**Expected:** The button still shows "Following" for that expert (state loaded from database, not just local React state).
**Why human:** Requires actual auth session, database round-trip, and browser reload to confirm persistence end-to-end.

### 3. /following page empty state

**Test:** As a user who follows no one, navigate to `/following`.
**Expected:** "Discover experts" button links to `/experts` (not `/leaderboard`).
**Why human:** Requires an account with zero follows to trigger the empty-state branch.

---

## Commits Verified

| Commit    | Plan  | Description                                        |
| --------- | ----- | -------------------------------------------------- |
| `53093af` | 15-01 | feat: add follow buttons to expert directory       |
| `4cfca4d` | 15-01 | feat: add expert list section to /following page   |
| `42478d8` | 15-02 | feat: prioritize followed-expert answers in homepage feed |

All three commits confirmed present in git log with correct file diffs.

---

## Summary

Phase 15 fully achieves its goal. All five observable truths are backed by substantive, wired implementations:

- `FollowButtonSmall` is a complete client component (not a stub) with optimistic UI, error rollback, pending state, and correct stopPropagation behavior for use inside Next.js `Link` wrappers.
- The expert directory fetches the authenticated user's follows in the existing parallel query batch, builds a `Set`, and passes correct `isFollowing` props to each card's button — with self-follow correctly suppressed.
- The `/following` page has a genuine "Your Experts" section that queries profile data for all followed experts and renders linked cards with avatar, name, and headline. The empty state correctly links to `/experts`.
- The homepage `page.jsx` adds a third query to the user-specific parallel batch (no extra round trip), builds `followedExpertIds` as a Set, and applies a three-tier sort that preserves featured-first ordering while elevating followed-expert answers above all others. Non-followed answers remain fully visible.
- All three requirement IDs (FLLW-01, FLLW-02, FLLW-03) are satisfied with no orphaned requirements.

---

_Verified: 2026-03-12T18:45:00Z_
_Verifier: Claude (gsd-verifier)_
