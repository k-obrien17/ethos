---
phase: 8
plan: "01"
title: "Email infrastructure, preferences, and unsubscribe"
wave: 1
depends_on: []
requirements: ["EMAL-01", "EMAL-06", "EMAL-07"]
files_modified:
  - "package.json"
  - "supabase/migrations/00009_email_preferences.sql"
  - "src/lib/email.js"
  - "src/app/api/unsubscribe/route.js"
  - "src/app/dashboard/notifications/page.jsx"
  - "src/components/EmailPreferencesForm.jsx"
  - "src/app/actions/profile.js"
  - "src/app/dashboard/page.jsx"
autonomous: true
estimated_tasks: 5
---

# Plan 01: Email infrastructure, preferences, and unsubscribe

## Objective

Set up the email foundation: Resend SDK, shared email utility with branded templates, per-user email preferences with self-service toggles, and a CAN-SPAM compliant unsubscribe endpoint. All subsequent email plans (featured notification, cron digests) build on this infrastructure.

## must_haves

- Resend SDK installed and configured with API key (EMAL-01)
- Shared email utility: `sendEmail(to, subject, html)` + `emailLayout(content, unsubscribeUrl)` (EMAL-01)
- Email preferences page at /dashboard/notifications with toggles for each email type (EMAL-06)
- `updateEmailPreferences` Server Action validates and persists toggle changes (EMAL-06)
- One-click unsubscribe link in email footer template — works without login (EMAL-07)
- Unsubscribe API route validates token, updates preferences via admin client (EMAL-07)
- Migration adds `email_preferences` JSONB + `unsubscribe_token` to profiles
- Dashboard page links to notification preferences

## Tasks

<task id="1" title="Install Resend and create email utility">
Run `npm install resend` to add the Resend SDK.

Create `src/lib/email.js`:

```javascript
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const SENDER = process.env.SENDER_EMAIL || 'Ethos <onboarding@resend.dev>'

export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set, skipping email')
    return { error: 'Email not configured' }
  }

  const { data, error } = await resend.emails.send({
    from: SENDER,
    to,
    subject,
    html,
  })

  if (error) {
    console.error('[email] Send failed:', error)
    return { error: error.message }
  }

  return { success: true, id: data?.id }
}

export function getUnsubscribeUrl(unsubscribeToken, type = 'all') {
  return `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}&type=${type}`
}

export function emailLayout(content, unsubscribeUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${SITE_URL}" style="text-decoration:none;">
        <span style="font-size:24px;font-weight:bold;color:#1c1917;">Ethos</span>
      </a>
    </div>
    <div style="background-color:#ffffff;border:1px solid #e7e5e4;border-radius:8px;padding:24px;">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;padding-top:16px;">
      <p style="font-size:12px;color:#a8a29e;margin:0;">
        You're receiving this because you have an Ethos account.
      </p>
      ${unsubscribeUrl ? `<p style="font-size:12px;color:#a8a29e;margin:8px 0 0;">
        <a href="${unsubscribeUrl}" style="color:#78716c;text-decoration:underline;">Unsubscribe</a>
      </p>` : ''}
    </div>
  </div>
</body>
</html>`
}
```

Key details:
- Graceful fallback: if `RESEND_API_KEY` not set, logs warning and returns error (dev-friendly)
- `emailLayout` wraps all emails in branded container with warm palette
- Unsubscribe link in footer uses token-based URL (no auth required)
- `SENDER_EMAIL` defaults to Resend's test sender for development
- `SITE_URL` from existing `NEXT_PUBLIC_SITE_URL` env var

Env vars to add to `.env.local` (and Vercel):
```
RESEND_API_KEY=re_...
SENDER_EMAIL=Ethos <notifications@ethos.app>
```
</task>

<task id="2" title="Migration: email_preferences and unsubscribe_token">
Create `supabase/migrations/00009_email_preferences.sql`:

```sql
-- ============================================================
-- Email notification preferences + unsubscribe token
-- ============================================================
-- Adds email preference toggles (JSONB) and a unique unsubscribe
-- token (UUID) to each profile. JSONB allows flexible preference
-- keys without schema changes for new email types.

-- Add email preferences and unsubscribe token to profiles
ALTER TABLE public.profiles
  ADD COLUMN email_preferences JSONB NOT NULL DEFAULT '{"daily_question":true,"weekly_recap":true,"budget_reset":true,"featured_answer":true}'::jsonb,
  ADD COLUMN unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Backfill unsubscribe tokens for existing profiles
UPDATE public.profiles
  SET unsubscribe_token = gen_random_uuid()::text
  WHERE unsubscribe_token IS NULL;

-- Make unsubscribe_token NOT NULL after backfill
ALTER TABLE public.profiles
  ALTER COLUMN unsubscribe_token SET NOT NULL;

-- Index for unsubscribe token lookups
CREATE INDEX idx_profiles_unsubscribe_token ON public.profiles (unsubscribe_token);
```

Key details:
- JSONB column with 4 boolean preferences (all true by default)
- `unsubscribe_token` is a UUID string, unique per user, auto-generated
- Two-step NOT NULL: add column with DEFAULT, backfill nulls, then set NOT NULL
- Existing profile RLS (`auth.uid() = id`) covers user self-service updates
- No new RLS needed — users can already UPDATE their own profile
</task>

<task id="3" title="Create unsubscribe API route">
Create `src/app/api/unsubscribe/route.js`:

```javascript
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const type = searchParams.get('type') || 'all'

  if (!token) {
    return new NextResponse(htmlPage('Invalid Link', 'This unsubscribe link is invalid.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const admin = createAdminClient()

  // Look up user by unsubscribe token
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email_preferences')
    .eq('unsubscribe_token', token)
    .single()

  if (!profile) {
    return new NextResponse(htmlPage('Invalid Link', 'This unsubscribe link is invalid or expired.'), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Update preferences
  const prefs = profile.email_preferences || {}

  if (type === 'all') {
    // Unsubscribe from all emails
    Object.keys(prefs).forEach(key => { prefs[key] = false })
  } else if (prefs.hasOwnProperty(type)) {
    prefs[type] = false
  } else {
    return new NextResponse(htmlPage('Invalid Type', 'Unknown email type.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const { error } = await admin
    .from('profiles')
    .update({ email_preferences: prefs })
    .eq('id', profile.id)

  if (error) {
    return new NextResponse(htmlPage('Error', 'Something went wrong. Please try again later.'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const message = type === 'all'
    ? 'You have been unsubscribed from all Ethos emails.'
    : `You have been unsubscribed from ${type.replace(/_/g, ' ')} emails.`

  return new NextResponse(htmlPage('Unsubscribed', message), {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  })
}

function htmlPage(title, message) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} — Ethos</title></head>
<body style="margin:0;padding:0;background-color:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:400px;margin:80px auto;text-align:center;padding:32px 24px;">
    <h1 style="font-size:24px;font-weight:bold;color:#1c1917;margin-bottom:8px;">Ethos</h1>
    <h2 style="font-size:18px;color:#44403c;margin-bottom:12px;">${title}</h2>
    <p style="color:#78716c;font-size:14px;">${message}</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || '/'}" style="display:inline-block;margin-top:24px;padding:10px 20px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">Back to Ethos</a>
  </div>
</body>
</html>`
}
```

Key details:
- GET route (works with simple link click — no form submission needed)
- Uses admin client to bypass RLS (unsubscribe is unauthenticated)
- Supports `?type=all` to disable all emails, or specific type like `?type=daily_question`
- Returns branded HTML confirmation page (not JSON — this is a user-facing link)
- Validates token exists and type is known
- No login required — CAN-SPAM compliant
</task>

<task id="4" title="Create email preferences page and Server Action">
Add `updateEmailPreferences` to `src/app/actions/profile.js`:

```javascript
export async function updateEmailPreferences(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const preferences = {
    daily_question: formData.get('daily_question') === 'on',
    weekly_recap: formData.get('weekly_recap') === 'on',
    budget_reset: formData.get('budget_reset') === 'on',
    featured_answer: formData.get('featured_answer') === 'on',
  }

  const { error } = await supabase
    .from('profiles')
    .update({ email_preferences: preferences })
    .eq('id', user.id)

  if (error) return { error: 'Failed to update preferences.' }

  revalidatePath('/dashboard/notifications')
  return { success: true }
}
```

Create `src/components/EmailPreferencesForm.jsx`:

```jsx
'use client'

import { useActionState } from 'react'
import { updateEmailPreferences } from '@/app/actions/profile'

const EMAIL_TYPES = [
  { key: 'daily_question', label: 'Daily question', description: "Each morning's question with a link to answer" },
  { key: 'weekly_recap', label: 'Weekly recap', description: "Monday summary of the week's questions and top answers" },
  { key: 'budget_reset', label: 'Budget reset', description: 'Notification when your monthly answer budget resets' },
  { key: 'featured_answer', label: 'Featured answer', description: 'When your answer is picked as an editorial feature' },
]

export default function EmailPreferencesForm({ preferences }) {
  const [state, formAction, pending] = useActionState(updateEmailPreferences, null)

  return (
    <form action={formAction} className="space-y-4">
      {EMAIL_TYPES.map(({ key, label, description }) => (
        <label key={key} className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name={key}
            defaultChecked={preferences?.[key] !== false}
            className="mt-1 rounded border-warm-300 text-warm-800 focus:ring-warm-500"
          />
          <div>
            <p className="text-sm font-medium text-warm-900">{label}</p>
            <p className="text-xs text-warm-500">{description}</p>
          </div>
        </label>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving...' : 'Save Preferences'}
        </button>
        {state?.success && (
          <span className="text-sm text-green-600">Preferences saved.</span>
        )}
        {state?.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </div>
    </form>
  )
}
```

Create `src/app/dashboard/notifications/page.jsx`:

```jsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EmailPreferencesForm from '@/components/EmailPreferencesForm'

export const metadata = {
  title: 'Notification Preferences',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('email_preferences')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-warm-500 hover:text-warm-700"
        >
          &larr; Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-warm-900 mt-3">
          Notification Preferences
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Choose which emails you'd like to receive from Ethos.
        </p>
      </div>

      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <EmailPreferencesForm preferences={profile?.email_preferences} />
      </section>
    </div>
  )
}
```
</task>

<task id="5" title="Add notifications link to dashboard">
Update `src/app/dashboard/page.jsx`:

Add a "Notification Preferences" link in the dashboard. Place it before the "Edit Profile" section. Add `Link` import if not already present.

```jsx
{/* Notification Preferences */}
<section className="bg-white rounded-lg border border-warm-200 p-6">
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-lg font-semibold text-warm-800">
        Notification Preferences
      </h2>
      <p className="text-sm text-warm-500 mt-1">
        Manage which emails you receive from Ethos.
      </p>
    </div>
    <Link
      href="/dashboard/notifications"
      className="px-4 py-2 bg-warm-100 text-warm-700 rounded-lg text-sm font-medium hover:bg-warm-200 transition-colors"
    >
      Manage
    </Link>
  </div>
</section>
```

Place this between the first-answer nudge and the "Edit Profile" section.
</task>

## Verification

- [ ] `npm install resend` succeeds and package.json updated
- [ ] `src/lib/email.js` exports `sendEmail`, `emailLayout`, `getUnsubscribeUrl`
- [ ] `sendEmail` gracefully handles missing RESEND_API_KEY (logs warning, returns error)
- [ ] Email layout includes branded header, content area, and unsubscribe footer
- [ ] Migration adds `email_preferences` JSONB with all-true defaults
- [ ] Migration adds `unsubscribe_token` with unique constraint
- [ ] Unsubscribe route works without auth (GET request with token param)
- [ ] Unsubscribe route returns branded HTML confirmation page
- [ ] Unsubscribe with `?type=all` disables all email types
- [ ] Unsubscribe with `?type=daily_question` disables only that type
- [ ] Invalid token returns 404 with error page
- [ ] Preferences page at /dashboard/notifications shows 4 toggles
- [ ] Saving preferences updates the JSONB column
- [ ] Dashboard shows "Notification Preferences" link
- [ ] `npm run build` succeeds
