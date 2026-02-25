# v2 Requirements Archive — Ethos

**Milestone:** v2 (engagement & retention)
**Completed:** 2026-02-25
**Total:** 24 requirements | **Pass:** 24

## Onboarding & Polish

- [x] **ONBR-01**: New users see a welcome screen after first sign-in that prompts them to complete their profile (handle, headline, bio)
- [x] **ONBR-02**: First-answer nudge — dashboard and homepage encourage new users who haven't answered yet
- [x] **ONBR-03**: Markdown preview toggle in answer compose form (live preview alongside textarea)
- [x] **ONBR-04**: 15-minute edit window after submitting an answer (body text only, no re-answering)
- [x] **ONBR-05**: Edit window enforced server-side (Server Action checks created_at + 15 min)

## Queue Preview

- [x] **QUEV-01**: Authenticated users can see upcoming questions for the next 3-7 days
- [x] **QUEV-02**: Queue preview page at /questions/upcoming (requires auth)
- [x] **QUEV-03**: Upcoming questions show publish date and category but not other experts' answers
- [x] **QUEV-04**: Queue preview depth configurable per user tier (default: 3 days free)

## Featured Answers

- [x] **FEAT-01**: Admin can mark one answer per question as "featured" (editorial pick)
- [x] **FEAT-02**: Featured answer displays with visual distinction (badge/highlight) in all feeds
- [x] **FEAT-03**: Featured answer appears first in the answer list on question pages and homepage
- [x] **FEAT-04**: Admin UI for featuring/unfeaturing answers (toggle in admin answers page)

## Email Notifications

- [x] **EMAL-01**: Email infrastructure integrated (Resend transactional email service)
- [x] **EMAL-02**: Daily question email — sent each morning with today's question and link to answer
- [x] **EMAL-03**: Budget reset notification — sent on the 1st of each month when answers reset
- [x] **EMAL-04**: Weekly recap digest — summary of the week's questions and top answers
- [x] **EMAL-05**: Notification when your answer is featured (editorial pick)
- [x] **EMAL-06**: Email preferences page — users can toggle each email type on/off
- [x] **EMAL-07**: One-click unsubscribe link in all emails (CAN-SPAM compliance)

## Activity & Bookmarks

- [x] **ACTV-01**: Users can bookmark upcoming questions they want to answer later
- [x] **ACTV-02**: Bookmarked questions appear in a "Saved" section on dashboard
- [x] **ACTV-03**: Notification (email) when a bookmarked question goes live
- [x] **ACTV-04**: Basic view count tracking on answers (visible to answer author on dashboard)

## Out of Scope (deferred to v3+)

| Feature | Reason |
|---------|--------|
| Stripe billing / premium tier | Validate engagement first, monetize in v3 |
| Embeddable answer widgets | Growth feature, not retention |
| In-app real-time notifications | Email is sufficient for daily cadence |
| Public view counts | Could create popularity contest — author-only for now |
| Topic/category browse pages | Nice-to-have, not critical for retention |
| Search | Low priority with <50 users and daily cadence |

---
*Archived: 2026-02-25*
