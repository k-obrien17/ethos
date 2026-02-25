---
milestone: v2
audited: 2026-02-25
status: tech_debt
scores:
  requirements: 22/24
  phases: 4/4
  integration: 4/4
  flows: 4/4
gaps:
  requirements:
    - id: "FEAT-02"
      status: "partial"
      phase: "7"
      claimed_by_plans: ["PLAN-02"]
      completed_by_plans: ["PLAN-02"]
      verification_status: "partial"
      evidence: "Featured badge displays on /q/[slug], /answers/[id], and homepage. Missing on /expert/[handle] page — inline article markup does not include featured prop."
    - id: "FEAT-03"
      status: "partial"
      phase: "7"
      claimed_by_plans: ["PLAN-02"]
      completed_by_plans: ["PLAN-02"]
      verification_status: "partial"
      evidence: "Featured-first sort implemented on /q/[slug] page. Homepage feed at /page.jsx uses created_at DESC without featured-first sorting."
  integration: []
  flows: []
tech_debt: []
---

# v2 Milestone Audit: Engagement & Retention

## Overview

| Metric | Score |
|--------|-------|
| Requirements | 22/24 (2 partial) |
| Phases complete | 4/4 |
| Cross-phase integration | 4/4 verified |
| E2E flows | 4/4 verified |

## Requirements Coverage

### Phase 6: Onboarding & Compose Polish (5/5 PASS)

| Req | Status | Evidence |
|-----|--------|----------|
| ONBR-01 | PASS | `src/app/welcome/page.jsx` + auth callback redirect to /welcome for new users |
| ONBR-02 | PASS | First-answer nudge on dashboard (`totalAnswers === 0`) and homepage (`userAnswerCount === 0`) |
| ONBR-03 | PASS | Write/Preview tabs in AnswerForm with react-markdown rendering |
| ONBR-04 | PASS | Client-side 15-min edit window with countdown timer in EditableAnswerCard |
| ONBR-05 | PASS | Server Action `editAnswer` checks `created_at` + 15 min, rejects with clear error |

### Phase 7: Queue Preview & Featured (6/8 — 2 partial)

| Req | Status | Evidence |
|-----|--------|----------|
| QUEV-01 | PASS | Upcoming questions page with configurable 3-7 day window |
| QUEV-02 | PASS | `/questions/upcoming` route with auth redirect |
| QUEV-03 | PASS | Only shows date, category, body — no answer data fetched |
| QUEV-04 | PASS | `queue_preview_days` column on profiles, CHECK 1-7, default 3 |
| FEAT-01 | PASS | Admin `toggleFeaturedAnswer` + UNIQUE partial index one-per-question |
| FEAT-02 | **PARTIAL** | Badge on /q/[slug], /answers/[id], homepage — **missing on /expert/[handle]** |
| FEAT-03 | **PARTIAL** | Featured-first sort on /q/[slug] — **missing on homepage feed** |
| FEAT-04 | PASS | ToggleFeatureButton in admin/answers page |

### Phase 8: Email Notifications (7/7 PASS)

| Req | Status | Evidence |
|-----|--------|----------|
| EMAL-01 | PASS | Resend SDK installed, `src/lib/email.js` with sendEmail/emailLayout/getUnsubscribeUrl |
| EMAL-02 | PASS | Daily question email in cron handler, "Answer now" CTA |
| EMAL-03 | PASS | Budget reset on 1st of month with answer_limit reminder |
| EMAL-04 | PASS | Weekly recap on Mondays with question table + featured highlights |
| EMAL-05 | PASS | Featured notification in toggleFeaturedAnswer (fire-and-forget) |
| EMAL-06 | PASS | `/dashboard/notifications` with 5-type EmailPreferencesForm |
| EMAL-07 | PASS | `/api/unsubscribe` with token-based no-login flow, CAN-SPAM compliant |

### Phase 9: Activity & Bookmarks (4/4 PASS)

| Req | Status | Evidence |
|-----|--------|----------|
| ACTV-01 | PASS | `toggleBookmark` action + BookmarkButton with optimistic UI on upcoming + question pages |
| ACTV-02 | PASS | Dashboard "Saved Questions" section with upcoming badge and remove toggle |
| ACTV-03 | PASS | Bookmark-goes-live email integrated into daily cron |
| ACTV-04 | PASS | view_count column + RPC, ViewTracker on answer pages, Total Views stat on dashboard (author-only) |

## Cross-Phase Integration

| Integration Point | Status | Evidence |
|-------------------|--------|----------|
| Bookmarks on queue preview (P7 page + P9 feature) | PASS | BookmarkButton imported and rendered on upcoming/page.jsx |
| Featured email uses P8 infrastructure | PASS | sendFeaturedEmail imports sendEmail/emailLayout from lib/email |
| Bookmark notification uses P8 cron | PASS | Bookmark email in same daily-emails/route.js handler |
| Email preferences cover all 5 types | PASS | EmailPreferencesForm lists all 5, updateEmailPreferences persists all 5 |

## Partial Gaps (Non-Critical)

### FEAT-02: Featured badge missing on expert profile page

**Impact:** Low — expert profile is a secondary feed view. The primary views (question page, answer page, homepage) all show the badge.

**Fix:** Pass `featured={!!answer.featured_at}` to a badge component in `/expert/[handle]/page.jsx`, or add inline badge markup to the answer article.

### FEAT-03: Featured-first sort missing on homepage

**Impact:** Low — the homepage shows today's question with answers. If a featured answer exists, it appears in chronological order rather than first. The primary answer list on `/q/[slug]` does sort featured first.

**Fix:** Add the same `sortedAnswers` logic from `/q/[slug]/page.jsx` to the homepage answer rendering.

## Recommendation

**Status: tech_debt** — All 24 requirements are addressed. 22 fully pass, 2 are partial (FEAT-02, FEAT-03) with minor scope gaps in secondary views. No critical blockers. Cross-phase integration is fully verified. Safe to complete the milestone and address the 2 partial items as tech debt or in a quick fix.
