# Roadmap: Ethos

## v1 — Beta Launch (Complete)

5 phases, 15 plans, 38 requirements. See [v1-ROADMAP.md](milestones/v1-ROADMAP.md) for full archive.

---

## v2 — Engagement & Retention

**Goal:** Keep 5-20 beta experts coming back daily. Polish the compose experience, give experts reasons to return (queue preview, featured answers), and build email infrastructure for daily/weekly touchpoints.
**Phases:** 4 (6-9) | **Requirements:** 24

---

### Phase 6: Onboarding & Compose Polish

**Goal:** Improve the first-run experience and answer composition flow so new experts feel guided and returning experts enjoy writing.
**Requirements:** ONBR-01, ONBR-02, ONBR-03, ONBR-04, ONBR-05

#### Deliverables

1. Welcome screen after first sign-in — prompts profile completion (handle, headline, bio)
2. First-answer nudge on dashboard and homepage for users with zero answers
3. Markdown preview toggle in AnswerForm (split view: textarea + live preview using react-markdown)
4. 15-minute edit window on answers — edit button appears on own answers within window
5. Server-side edit enforcement: Server Action checks `created_at` + 15 minutes, RLS unchanged (experts can already UPDATE own visible answers)
6. Edit UI: inline edit mode on AnswerCard (own answers only, within window)

#### Done When

- [ ] New user's first login redirects to a welcome/profile-setup page
- [ ] Dashboard shows "Answer your first question" prompt for zero-answer users
- [ ] Answer form has a working preview toggle showing rendered Markdown
- [ ] Expert can edit their answer body within 15 minutes of submission
- [ ] Edit attempt after 15 minutes is rejected with clear error message
- [ ] `npm run build` succeeds

---

### Phase 7: Queue Preview & Featured Answers

**Goal:** Give experts strategic visibility into upcoming questions and highlight exceptional answers with editorial picks.
**Requirements:** QUEV-01, QUEV-02, QUEV-03, QUEV-04, FEAT-01, FEAT-02, FEAT-03, FEAT-04

#### Deliverables

1. Queue preview page at `/questions/upcoming` — list of next 3-7 days' questions (auth required)
2. Preview depth configurable: `queue_preview_days` column on profiles (default 3)
3. Upcoming questions show publish date and category only (no answers visible)
4. `featured_at` / `featured_by` columns on answers (same pattern as hidden_at)
5. Admin toggle to feature/unfeature answers (one per question)
6. Featured answer badge + visual highlight in all feed views
7. Featured answers sort first on question pages

#### Done When

- [ ] Authenticated user can see upcoming questions at `/questions/upcoming`
- [ ] Unauthenticated user is redirected to login from queue preview
- [ ] Queue preview shows date and category but no answer data
- [ ] Admin can feature one answer per question
- [ ] Featured answer has visual distinction (badge/highlight) on question page
- [ ] Featured answer appears first in answer list
- [ ] `npm run build` succeeds

---

### Phase 8: Email Notifications

**Goal:** Build email infrastructure and send daily/weekly emails that bring experts back to the platform.
**Requirements:** EMAL-01, EMAL-02, EMAL-03, EMAL-04, EMAL-05, EMAL-06, EMAL-07

#### Deliverables

1. Email service integration (Resend) with API key and sender domain
2. Email template system — branded HTML emails with warm color palette
3. Daily question email: sent each morning with question body + "Answer now" CTA
4. Budget reset email: sent on 1st of month when answers reset
5. Weekly recap: top answers from the week, questions summary
6. Featured answer notification: email when your answer is picked
7. Email preferences page at `/dashboard/notifications` — toggle each type
8. `email_preferences` JSONB column on profiles (or separate table)
9. One-click unsubscribe via signed token in email footer
10. Cron/scheduled function for daily and weekly sends (Vercel Cron or Supabase pg_cron)

#### Done When

- [ ] Test email sends successfully via Resend
- [ ] User receives daily question email with working link
- [ ] User receives budget reset email on month boundary
- [ ] User receives weekly recap with answer highlights
- [ ] User receives featured answer notification
- [ ] User can toggle each email type on/off from preferences page
- [ ] Unsubscribe link in emails works without requiring login
- [ ] `npm run build` succeeds

---

### Phase 9: Activity & Bookmarks

**Goal:** Let experts bookmark upcoming questions and see basic engagement metrics on their answers.
**Requirements:** ACTV-01, ACTV-02, ACTV-03, ACTV-04

#### Deliverables

1. `bookmarks` table (user_id, question_id, created_at) with RLS
2. Bookmark button on upcoming queue preview and question pages
3. "Saved Questions" section on dashboard showing bookmarked questions
4. Notification when a bookmarked question's publish_date arrives (integrates with Phase 8 email)
5. `view_count` column on answers (incremented via lightweight API route or middleware)
6. View count visible to answer author on dashboard (not public)

#### Done When

- [ ] User can bookmark a question from queue preview or question page
- [ ] Bookmarked questions appear in dashboard "Saved" section
- [ ] User receives notification when bookmarked question goes live
- [ ] Answer author can see view count on their dashboard
- [ ] View counts are not visible to other users
- [ ] `npm run build` succeeds

---

## Phase Summary

| Phase | Name | Requirements | Count |
|-------|------|-------------|-------|
| 6 | Onboarding & Compose Polish | ONBR-01–05 | 5 |
| 7 | Queue Preview & Featured | QUEV-01–04, FEAT-01–04 | 8 |
| 8 | Email Notifications | EMAL-01–07 | 7 |
| 9 | Activity & Bookmarks | ACTV-01–04 | 4 |
| **Total** | | | **24** |

## Dependencies Between Phases

```
Phase 6: Onboarding & Compose Polish
    │
    ▼
Phase 7: Queue Preview & Featured ──► Phase 9: Activity & Bookmarks
    │                                      ▲
    ▼                                      │
Phase 8: Email Notifications ──────────────┘
```

- Phase 6 is independent — can start immediately
- Phase 7 requires Phase 6 (onboarding establishes user flow patterns)
- Phase 8 can run in parallel with Phase 7 (email infra is independent)
- Phase 9 depends on both Phase 7 (bookmarks are on queue preview) and Phase 8 (bookmark notifications use email)

---
*Last updated: 2026-02-25*
