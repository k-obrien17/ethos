# Phase 8 Research: Email Notifications

## Current State

### Email Infrastructure
- **No email libraries installed** — package.json has no resend, nodemailer, or similar
- **No email-related env vars** — .env.local has Supabase + service role key only
- **No vercel.json** — no cron jobs configured
- **No email templates** — no HTML email infrastructure exists

### Existing API Routes
- Only `src/app/api/og/route.jsx` (OG image generation)
- No cron, notification, or unsubscribe routes

### User Email Access
- User emails live in `auth.users` (Supabase auth), not in `profiles` table
- Admin client (`src/lib/supabase/admin.js`) can access `auth.admin.getUserById(id)` to get email
- For 5-20 beta users, per-user admin lookup is acceptable (no batch optimization needed)

### Featured Answer Hook Point
- `toggleFeaturedAnswer` in `src/app/actions/answers.js` — admin-only Server Action
- After successfully featuring an answer, can fire off email notification
- Already has access to answerId and question context

### Dashboard Structure
- `src/app/dashboard/page.jsx` — profile header, stats grid, first-answer nudge, edit profile, delete account
- No notifications section exists — need to add link to `/dashboard/notifications`

### Profile Actions
- `src/app/actions/profile.js` — `updateProfile` and `deleteAccount`
- Will add `updateEmailPreferences` action here

### Profile Schema (current)
- profiles table: id, handle, display_name, bio, avatar_url, linkedin_url, headline, organization, role, answer_limit, queue_preview_days, created_at, updated_at
- Existing user-update RLS: `auth.uid() = id`
- Adding JSONB column to profiles is simpler than a separate table for preferences

### Middleware
- `src/middleware.js` — Supabase session refresh only
- Cron routes will need to verify `CRON_SECRET` header (Vercel sends `Authorization: Bearer <CRON_SECRET>`)
- Unsubscribe route is unauthenticated (uses token-based identity)

## Key Decisions

### Email Service: Resend
- **Decision:** Use Resend — designed for Vercel, simple API, free tier sufficient for beta (100 emails/day)
- Install: `npm install resend`
- Env: `RESEND_API_KEY`, `SENDER_EMAIL` (e.g., `Ethos <notifications@ethos.app>`)

### Preferences Storage: JSONB on Profiles
- **Decision:** Add `email_preferences JSONB` and `unsubscribe_token TEXT UNIQUE` columns to profiles
- JSONB default: `{"daily_question":true,"weekly_recap":true,"budget_reset":true,"featured_answer":true}`
- Avoids separate table, trigger, and RLS setup
- Existing profile update RLS covers user self-service toggles
- Unsubscribe token auto-generated as UUID for each profile

### Unsubscribe: Token-Based (No Auth Required)
- **Decision:** Each profile gets a unique `unsubscribe_token` (UUID)
- Unsubscribe link: `/api/unsubscribe?token={token}&type={emailType}`
- API route uses admin client (bypass RLS) to update preferences
- No login required — CAN-SPAM compliant
- Token is not guessable (UUID v4 = 122 bits of entropy)

### Cron: Single Daily Route
- **Decision:** One Vercel Cron route at `/api/cron/daily-emails` running daily at 9 AM UTC
- Route checks today's date:
  - Every day: send daily question email to opted-in users
  - 1st of month: also send budget reset notification
  - Mondays: also send weekly recap
- Single route simplifies config and avoids multiple cron entries
- Auth: verify `CRON_SECRET` header

### Email Templates: Inline HTML
- **Decision:** Build HTML email strings directly (no react-email dependency)
- Shared `emailLayout(content, unsubscribeUrl)` wrapper in `src/lib/email.js`
- Warm color palette: bg #faf9f7, text #1c1917, accent #44403c, muted #a8a29e
- Each email type constructs its own content HTML

### Featured Notification: Direct from Server Action
- **Decision:** Send email directly in `toggleFeaturedAnswer` action (no queue/API route needed)
- Import `sendEmail` from lib/email.js, fetch expert email via admin client
- Check preferences before sending
- Simple for beta scale; can add queuing later if needed

## Plan Structure

| Plan | Wave | Requirements | Files Modified |
|------|------|-------------|----------------|
| 01 | 1 | EMAL-01, EMAL-06, EMAL-07 | package.json, migration, lib/email.js, api/unsubscribe, dashboard/notifications, EmailPreferencesForm, actions/profile.js, dashboard/page.jsx |
| 02 | 2 | EMAL-05 | actions/answers.js |
| 03 | 2 | EMAL-02, EMAL-03, EMAL-04 | vercel.json, api/cron route |

Plan 01 in Wave 1 (infrastructure). Plans 02 and 03 in Wave 2 (parallel, no file overlap — Plan 02 modifies answers.js, Plan 03 creates new cron files).
