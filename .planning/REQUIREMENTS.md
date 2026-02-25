# Requirements: Ethos v2

**Defined:** 2026-02-25
**Milestone:** v2 — Engagement & Retention
**Goal:** Keep 5-20 beta experts coming back daily by adding email digests, queue preview, featured answers, notifications, and polishing the compose/onboarding experience.

## v2 Requirements

### Onboarding & Polish

- [ ] **ONBR-01**: New users see a welcome screen after first sign-in that prompts them to complete their profile (handle, headline, bio)
- [ ] **ONBR-02**: First-answer nudge — dashboard and homepage encourage new users who haven't answered yet
- [ ] **ONBR-03**: Markdown preview toggle in answer compose form (live preview alongside textarea)
- [ ] **ONBR-04**: 15-minute edit window after submitting an answer (body text only, no re-answering)
- [ ] **ONBR-05**: Edit window enforced server-side (Server Action checks created_at + 15 min)

### Queue Preview

- [ ] **QUEV-01**: Authenticated users can see upcoming questions for the next 3-7 days
- [ ] **QUEV-02**: Queue preview page at /questions/upcoming (requires auth)
- [ ] **QUEV-03**: Upcoming questions show publish date and category but not other experts' answers
- [ ] **QUEV-04**: Queue preview depth configurable per user tier (default: 3 days free)

### Featured Answers

- [ ] **FEAT-01**: Admin can mark one answer per question as "featured" (editorial pick)
- [ ] **FEAT-02**: Featured answer displays with visual distinction (badge/highlight) in all feeds
- [ ] **FEAT-03**: Featured answer appears first in the answer list on question pages
- [ ] **FEAT-04**: Admin UI for featuring/unfeaturing answers (toggle in admin answers page)

### Email Notifications

- [ ] **EMAL-01**: Email infrastructure integrated (Resend or similar transactional email service)
- [ ] **EMAL-02**: Daily question email — sent each morning with today's question and link to answer
- [ ] **EMAL-03**: Budget reset notification — sent on the 1st of each month when answers reset
- [ ] **EMAL-04**: Weekly recap digest — summary of the week's questions and top answers
- [ ] **EMAL-05**: Notification when your answer is featured (editorial pick)
- [ ] **EMAL-06**: Email preferences page — users can toggle each email type on/off
- [ ] **EMAL-07**: One-click unsubscribe link in all emails (CAN-SPAM compliance)

### Activity & Bookmarks

- [ ] **ACTV-01**: Users can bookmark upcoming questions they want to answer later
- [ ] **ACTV-02**: Bookmarked questions appear in a "Saved" section on dashboard
- [ ] **ACTV-03**: Notification (email or in-dashboard) when a bookmarked question goes live
- [ ] **ACTV-04**: Basic view count tracking on answers (visible to answer author on dashboard)

## Out of Scope (v2)

| Feature | Reason |
|---------|--------|
| Stripe billing / premium tier | Validate engagement first, monetize in v3 |
| Embeddable answer widgets | Growth feature, not retention |
| In-app real-time notifications | Email is sufficient for daily cadence |
| Public view counts | Could create popularity contest — author-only for now |
| Topic/category browse pages | Nice-to-have, not critical for retention |
| Search | Low priority with <50 users and daily cadence |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBR-01 | 6 — Onboarding & Compose Polish | Pending |
| ONBR-02 | 6 — Onboarding & Compose Polish | Pending |
| ONBR-03 | 6 — Onboarding & Compose Polish | Pending |
| ONBR-04 | 6 — Onboarding & Compose Polish | Pending |
| ONBR-05 | 6 — Onboarding & Compose Polish | Pending |
| QUEV-01 | 7 — Queue Preview & Featured | Pending |
| QUEV-02 | 7 — Queue Preview & Featured | Pending |
| QUEV-03 | 7 — Queue Preview & Featured | Pending |
| QUEV-04 | 7 — Queue Preview & Featured | Pending |
| FEAT-01 | 7 — Queue Preview & Featured | Pending |
| FEAT-02 | 7 — Queue Preview & Featured | Pending |
| FEAT-03 | 7 — Queue Preview & Featured | Pending |
| FEAT-04 | 7 — Queue Preview & Featured | Pending |
| EMAL-01 | 8 — Email Notifications | Pending |
| EMAL-02 | 8 — Email Notifications | Pending |
| EMAL-03 | 8 — Email Notifications | Pending |
| EMAL-04 | 8 — Email Notifications | Pending |
| EMAL-05 | 8 — Email Notifications | Pending |
| EMAL-06 | 8 — Email Notifications | Pending |
| EMAL-07 | 8 — Email Notifications | Pending |
| ACTV-01 | 9 — Activity & Bookmarks | Pending |
| ACTV-02 | 9 — Activity & Bookmarks | Pending |
| ACTV-03 | 9 — Activity & Bookmarks | Pending |
| ACTV-04 | 9 — Activity & Bookmarks | Pending |

**Coverage:**
- v2 requirements: 24 total
- Mapped to phases: 24 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-25*
