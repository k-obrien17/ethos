# v2 Roadmap Archive — Ethos

**Milestone:** v2 (engagement & retention)
**Completed:** 2026-02-25
**Phases:** 4 | **Plans:** 10 | **Requirements:** 24 | **Commits:** 14

## Stats

- **Files changed:** 56 (5,517 insertions, 52 deletions)
- **Migrations:** 5 SQL files (00007–00011)
- **New routes:** 6 (welcome, upcoming, notifications, daily-emails cron, unsubscribe, view count API)
- **New components:** 7 (EditableAnswerCard, BookmarkButton, ViewTracker, EmailPreferencesForm, ToggleFeatureButton, AnswerForm preview, welcome page)
- **Verification:** 24/24 requirements pass
- **Integration:** 4/4 cross-phase points verified

## Key Accomplishments

1. **Onboarding flow:** Welcome screen for new users, first-answer nudge on dashboard and homepage
2. **Compose polish:** Markdown preview in answer form, 15-minute edit window with server-side enforcement and countdown timer
3. **Queue preview:** Configurable upcoming questions page (1-7 days) giving experts strategic visibility into future questions
4. **Featured answers:** Admin editorial picks with amber star badge, featured-first sorting across all views, email notification
5. **Email infrastructure:** Resend integration, daily question/weekly recap/budget reset cron emails, preferences page, CAN-SPAM compliant token-based unsubscribe
6. **Bookmarks & activity:** Save upcoming questions with optimistic UI, bookmark-goes-live email notifications, answer view count tracking with atomic RPC increment

## Phase Summary

| Phase | Name | Plans | Requirements | Commits |
|-------|------|-------|-------------|---------|
| 6 | Onboarding & Compose Polish | 3 | ONBR-01–05 (5) | 77b0dbc |
| 7 | Queue Preview & Featured | 2 | QUEV-01–04, FEAT-01–04 (8) | 5412049 |
| 8 | Email Notifications | 3 | EMAL-01–07 (7) | a51f9d1 |
| 9 | Activity & Bookmarks | 2 | ACTV-01–04 (4) | 9413fc9, 106830f |

## Phase Details

### Phase 6: Onboarding & Compose Polish
**Goal:** Improve the first-run experience and answer composition flow so new experts feel guided and returning experts enjoy writing.
- Welcome page at `/welcome` with profile setup prompt
- First-answer nudge on dashboard and homepage for zero-answer users
- Write/Preview tabs in AnswerForm with react-markdown rendering
- 15-minute edit window: EditableAnswerCard with countdown timer, `editAnswer` Server Action with server-side enforcement

### Phase 7: Queue Preview & Featured Answers
**Goal:** Give experts strategic visibility into upcoming questions and highlight exceptional answers with editorial picks.
- Queue preview at `/questions/upcoming` (auth-gated, configurable 1-7 day window)
- `queue_preview_days` column on profiles with CHECK constraint
- `featured_at`/`featured_by` columns on answers with UNIQUE partial index (one per question)
- ToggleFeatureButton in admin panel, featured badge + featured-first sorting on all feed views

### Phase 8: Email Notifications
**Goal:** Build email infrastructure and send daily/weekly emails that bring experts back to the platform.
- Resend SDK with `src/lib/email.js` utility (sendEmail, emailLayout, getUnsubscribeUrl)
- `email_preferences` JSONB on profiles (5 types: daily_question, weekly_recap, budget_reset, featured_answer, bookmark_live)
- Vercel Cron at `/api/cron/daily-emails` — daily question, weekly recap (Mondays), budget reset (1st of month)
- Featured answer notification (fire-and-forget in toggleFeaturedAnswer)
- Email preferences page at `/dashboard/notifications`
- Token-based unsubscribe at `/api/unsubscribe` (no login required, CAN-SPAM compliant)

### Phase 9: Activity & Bookmarks
**Goal:** Let experts bookmark upcoming questions and see basic engagement metrics on their answers.
- `bookmarks` table with composite PK, CASCADE deletes, 3 RLS policies
- BookmarkButton with `useOptimistic` on upcoming queue and question pages
- Dashboard "Saved Questions" section with upcoming badge, category, links
- Bookmark-goes-live email integrated into daily cron
- `view_count` column + `increment_view_count` RPC (SECURITY DEFINER, atomic increment)
- ViewTracker client component on answer pages, Total Views stat on dashboard (author-only)

---
*Archived: 2026-02-25*
