---
phase: 16-notifications
verified: 2026-03-12T20:35:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 16: Notifications Verification Report

**Phase Goal:** Users stay informed about activity that matters to them without having to check manually
**Verified:** 2026-03-12T20:35:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                           | Status     | Evidence                                                                                            |
|----|---------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------------|
| 1  | User receives in-app notification when someone replies to their comment          | VERIFIED   | `comments.js:61-81` inserts `type: 'comment_reply'` when parentId present, excluding self and answer author |
| 2  | User receives in-app notification when a followed expert posts a new answer      | VERIFIED   | `answers.js:175-189` batch-inserts `type: 'followed_expert_posted'` to all followers via admin client |
| 3  | Existing comment, follow, and featured notifications continue to work            | VERIFIED   | Migration adds new types without removing existing ones; comments.js existing answer-author path unchanged |
| 4  | All five notification types display correctly in the notification feed            | VERIFIED   | `NotificationFeed.jsx` ICONS object and getMessage() handle: like, comment, follow, featured, comment_reply, followed_expert_posted |
| 5  | User can toggle in-app and email preferences independently for each notification type | VERIFIED | `EmailPreferencesForm.jsx` renders NOTIFICATION_TYPES with dual `{key}_inapp` / `{key}_email` checkboxes |
| 6  | User receives email digests for notification types they opted into               | VERIFIED   | `daily-emails/route.js:265-337` Activity Notification Digest section queries unread notifications filtered by `_email` prefs |
| 7  | Notification preferences page shows both in-app and email toggles               | VERIFIED   | `notifications/page.jsx:69-72` renders "Notification Preferences" section with EmailPreferencesForm |
| 8  | In-app preference toggles filter which notification types appear in the feed     | VERIFIED   | `notifications/page.jsx:26-47` builds `enabledInAppTypes` from `_inapp` prefs; applies `.in('type', enabledInAppTypes)` to query |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact                                              | Provides                                               | Status    | Details                                                                                     |
|-------------------------------------------------------|--------------------------------------------------------|-----------|---------------------------------------------------------------------------------------------|
| `supabase/migrations/00025_notification_types.sql`    | Schema updates for new notification types              | VERIFIED  | Drops and recreates type CHECK to include comment_reply and followed_expert_posted           |
| `src/app/actions/comments.js`                         | Comment reply notification trigger                     | VERIFIED  | Lines 60-81 fire notification on reply; guards self-notify and duplicate author notify      |
| `src/app/actions/answers.js`                          | Followed-expert-posted notification trigger            | VERIFIED  | Lines 175-189 batch insert to all followers via admin client (fire-and-forget)              |
| `src/components/NotificationFeed.jsx`                 | Display for all 5 notification types (+ like = 6)     | VERIFIED  | ICONS and getMessage() handle all types; getHref() links to question slug or answer id      |
| `src/components/EmailPreferencesForm.jsx`             | Unified notification preferences dual toggles          | VERIFIED  | NOTIFICATION_TYPES renders _inapp + _email per activity type; EMAIL_ONLY_TYPES single toggle |
| `src/app/actions/profile.js`                          | Server action for both in-app and email pref updates  | VERIFIED  | Lines 183-194 read all _inapp and _email keys; backward compat featured_answer key preserved |
| `src/app/api/cron/daily-emails/route.js`              | Email digest for activity notifications                | VERIFIED  | Activity Notification Digest block at line 265; respects _email prefs; sends via sendEmail   |
| `src/app/dashboard/notifications/page.jsx`            | Notification preferences section on notifications page | VERIFIED  | Fetches profile prefs, builds enabledInAppTypes, filters feed query, renders both sections  |

---

### Key Link Verification

| From                                   | To                        | Via                                           | Status   | Details                                                                                  |
|----------------------------------------|---------------------------|-----------------------------------------------|----------|------------------------------------------------------------------------------------------|
| `src/app/actions/comments.js`          | notifications table       | supabase insert with type comment_reply       | WIRED    | Line 73-79: `supabase.from('notifications').insert({ type: 'comment_reply', ... })`     |
| `src/app/actions/answers.js`           | notifications table       | admin insert with type followed_expert_posted | WIRED    | Line 183-189: `admin.from('notifications').insert(notifications)` with followed_expert_posted |
| `src/components/EmailPreferencesForm.jsx` | `src/app/actions/profile.js` | updateEmailPreferences server action       | WIRED    | Line 4 imports; line 22 wires to useActionState; form renders with action               |
| `src/app/api/cron/daily-emails/route.js` | notifications table     | query unread notifications by _email prefs    | WIRED    | Line 292 `.in('type', enabledTypes)` filtering by opted-in notification types            |
| `src/app/dashboard/notifications/page.jsx` | profiles.email_preferences | filter notification query by _inapp prefs | WIRED    | Line 26-47: builds enabledInAppTypes from prefs, applies `.in('type', enabledInAppTypes)` |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                         | Status    | Evidence                                                                                 |
|-------------|-------------|---------------------------------------------------------------------|-----------|------------------------------------------------------------------------------------------|
| NOTF-01     | 16-01       | In-app notification when someone comments on your answer            | SATISFIED | Pre-existing `type: 'comment'` insert in comments.js; migration preserves constraint     |
| NOTF-02     | 16-01       | In-app notification when someone follows you                        | SATISFIED | Pre-existing `type: 'follow'` insert in follows.js; migration preserves constraint       |
| NOTF-03     | 16-01       | In-app notification when someone replies to your comment            | SATISFIED | comments.js:60-81 inserts `comment_reply`; migration adds type to CHECK constraint       |
| NOTF-04     | 16-01       | In-app notification when a followed expert posts an answer          | SATISFIED | answers.js:175-189 batch-inserts `followed_expert_posted` to all follower user rows      |
| NOTF-05     | 16-01       | In-app notification when your answer is featured                    | SATISFIED | Pre-existing `type: 'featured'` insert in toggleFeaturedAnswer; migration preserves it   |
| NOTF-06     | 16-02       | User receives email for notifications based on their email prefs    | SATISFIED | daily-emails cron lines 265-337 send digest per opted-in type; unsubscribe URL included  |
| NOTF-07     | 16-02       | User can configure notification preferences (per-type on/off)       | SATISFIED | EmailPreferencesForm dual toggles; profile.js saves; notifications page filters feed     |

All 7 requirements from REQUIREMENTS.md for Phase 16 are SATISFIED. No orphaned requirements detected.

---

### Anti-Patterns Found

| File                                              | Line | Pattern        | Severity | Impact                                           |
|---------------------------------------------------|------|----------------|----------|--------------------------------------------------|
| `src/components/NotificationFeed.jsx`             | 79   | `return null`  | Info     | Inside `getHref()` helper — valid logic for notifications without an answer link, not a stub |

No blockers or warnings found. The single `return null` occurrence is a legitimate early-return in a link-building helper, not a placeholder component.

---

### Human Verification Required

#### 1. Notification feed rendering with real data

**Test:** Log in as a user who has received all five notification types (like, comment, follow, featured, comment_reply, followed_expert_posted) and navigate to `/dashboard/notifications`.
**Expected:** Each notification shows the correct icon (distinct per type) and a sensible human-readable message.
**Why human:** Cannot verify SVG icon correctness or message copy quality programmatically.

#### 2. In-app preference toggle actually hides notifications

**Test:** On `/dashboard/notifications`, uncheck "In-app" for "Comments on your answers". Reload the page.
**Expected:** Comment-type notifications no longer appear in the feed.
**Why human:** The filter logic is present in code; verifying it works end-to-end requires a browser session with actual preference data.

#### 3. Email digest delivery

**Test:** Opt a test account into email preferences for one activity type, trigger a notification, then manually invoke or wait for the daily cron.
**Expected:** Email arrives with the correct digest format and an unsubscribe link.
**Why human:** Cron execution and email delivery require live infrastructure (Vercel + Resend).

#### 4. Preference defaults on first visit

**Test:** Log in as a brand-new user with no `email_preferences` set and visit `/dashboard/notifications`.
**Expected:** All in-app toggles are ON (defaulting to show), all email toggles are OFF (opt-in).
**Why human:** Default handling (`prefs[prefKey] !== false`) is implemented but requires a real new-user account to observe rendered checkbox states.

---

### Gaps Summary

No gaps found. All automated checks passed at all three levels (exists, substantive, wired) for all eight must-have truths across both plans (16-01 and 16-02). All seven NOTF requirements are fully satisfied and traceable to implementation.

---

_Verified: 2026-03-12T20:35:00Z_
_Verifier: Claude (gsd-verifier)_
