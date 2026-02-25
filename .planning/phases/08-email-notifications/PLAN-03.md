---
phase: 8
plan: "03"
title: "Scheduled emails — daily question, budget reset, weekly recap"
wave: 2
depends_on: ["01"]
requirements: ["EMAL-02", "EMAL-03", "EMAL-04"]
files_modified:
  - "vercel.json"
  - "src/app/api/cron/daily-emails/route.js"
autonomous: true
estimated_tasks: 3
---

# Plan 03: Scheduled emails — daily question, budget reset, weekly recap

## Objective

Set up a single Vercel Cron job that runs daily at 9 AM UTC. Each day it sends the daily question email to opted-in users. On the 1st of each month, it also sends budget reset notifications. On Mondays, it sends a weekly recap digest. Uses the email infrastructure from Plan 01.

## must_haves

- Daily question email sent each morning with today's question and "Answer now" CTA (EMAL-02)
- Budget reset notification sent on the 1st of each month (EMAL-03)
- Weekly recap digest sent on Mondays with the week's questions and top answers (EMAL-04)
- All emails respect per-user preferences
- All emails include unsubscribe link in footer
- Cron route protected by CRON_SECRET verification
- Graceful handling: missing API key, no users, no questions

## Tasks

<task id="1" title="Create vercel.json with cron schedule">
Create `vercel.json` at project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-emails",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This runs the daily-emails route every day at 9:00 AM UTC. The route itself determines which email types to send based on the current date.

Note: `CRON_SECRET` env var must be set on Vercel for the cron to include the authorization header. The route verifies this header.
</task>

<task id="2" title="Create cron route handler">
Create `src/app/api/cron/daily-emails/route.js`:

```javascript
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, emailLayout, getUnsubscribeUrl } from '@/lib/email'
import { NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'

export async function GET(request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const isFirstOfMonth = today.getDate() === 1
  const isMonday = today.getDay() === 1

  const results = { daily: 0, budget_reset: 0, weekly_recap: 0, errors: 0 }

  try {
    // Get all profiles with their preferences
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name, email_preferences, unsubscribe_token, answer_limit')

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: 'No profiles found', results })
    }

    // Get all auth users (for emails) — fine for beta scale (5-20 users)
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = {}
    users.forEach(u => { emailMap[u.id] = u.email })

    // Fetch today's question
    const { data: todayQuestion } = await admin
      .from('questions')
      .select('id, body, slug, category')
      .lte('publish_date', todayStr)
      .in('status', ['scheduled', 'published'])
      .order('publish_date', { ascending: false })
      .limit(1)
      .single()

    // === Daily Question Email ===
    if (todayQuestion) {
      const questionUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/q/${todayQuestion.slug}`

      for (const profile of profiles) {
        if (!profile.email_preferences?.daily_question) continue
        const email = emailMap[profile.id]
        if (!email) continue

        const content = `
          <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
            Good morning, ${escapeHtml(profile.display_name)}. Today's question is ready.
          </p>
          <div style="background-color:#faf9f7;border-radius:6px;padding:16px;margin:0 0 8px;">
            ${todayQuestion.category ? `<p style="font-size:11px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">${escapeHtml(todayQuestion.category)}</p>` : ''}
            <p style="font-size:17px;color:#1c1917;font-weight:600;margin:0;">
              ${escapeHtml(todayQuestion.body)}
            </p>
          </div>
          <p style="font-size:13px;color:#a8a29e;margin:0 0 20px;">
            ${format(today, 'EEEE, MMMM d, yyyy')}
          </p>
          <div style="text-align:center;">
            <a href="${questionUrl}" style="display:inline-block;padding:10px 24px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
              Answer now
            </a>
          </div>
        `

        const unsubscribeUrl = getUnsubscribeUrl(profile.unsubscribe_token, 'daily_question')
        const { error } = await sendEmail({
          to: email,
          subject: `Today on Ethos: ${todayQuestion.body.slice(0, 60)}${todayQuestion.body.length > 60 ? '...' : ''}`,
          html: emailLayout(content, unsubscribeUrl),
        })

        if (error) { results.errors++ } else { results.daily++ }
      }
    }

    // === Budget Reset Email (1st of month) ===
    if (isFirstOfMonth) {
      for (const profile of profiles) {
        if (!profile.email_preferences?.budget_reset) continue
        const email = emailMap[profile.id]
        if (!email) continue

        const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`

        const content = `
          <h2 style="font-size:18px;color:#1c1917;margin:0 0 8px;">Your answer budget has reset</h2>
          <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
            Happy ${format(today, 'MMMM')}, ${escapeHtml(profile.display_name)}! You have ${profile.answer_limit} fresh answers to use this month.
          </p>
          <p style="font-size:14px;color:#44403c;margin:0 0 20px;">
            Remember: every answer you give is a statement of what matters to you. Choose wisely.
          </p>
          <div style="text-align:center;">
            <a href="${dashboardUrl}" style="display:inline-block;padding:10px 24px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
              View your dashboard
            </a>
          </div>
        `

        const unsubscribeUrl = getUnsubscribeUrl(profile.unsubscribe_token, 'budget_reset')
        const { error } = await sendEmail({
          to: email,
          subject: `Your Ethos answer budget has reset — ${profile.answer_limit} answers available`,
          html: emailLayout(content, unsubscribeUrl),
        })

        if (error) { results.errors++ } else { results.budget_reset++ }
      }
    }

    // === Weekly Recap Email (Mondays) ===
    if (isMonday) {
      // Get last week's questions and answer counts
      const weekStart = format(subDays(today, 7), 'yyyy-MM-dd')
      const weekEnd = format(subDays(today, 1), 'yyyy-MM-dd')

      const { data: weekQuestions } = await admin
        .from('questions')
        .select('body, slug, category, publish_date, answers(count)')
        .gte('publish_date', weekStart)
        .lte('publish_date', weekEnd)
        .in('status', ['scheduled', 'published'])
        .order('publish_date', { ascending: true })

      // Get featured answers from last week
      const { data: featuredAnswers } = await admin
        .from('answers')
        .select(`
          body,
          featured_at,
          profiles!expert_id (display_name),
          questions!question_id (body, slug)
        `)
        .gte('featured_at', new Date(weekStart).toISOString())
        .lte('featured_at', new Date(weekEnd + 'T23:59:59Z').toISOString())
        .not('featured_at', 'is', null)

      if (weekQuestions && weekQuestions.length > 0) {
        for (const profile of profiles) {
          if (!profile.email_preferences?.weekly_recap) continue
          const email = emailMap[profile.id]
          if (!email) continue

          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

          let questionsHtml = weekQuestions.map(q => {
            const count = q.answers?.[0]?.count ?? 0
            return `
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #e7e5e4;">
                  <a href="${siteUrl}/q/${q.slug}" style="color:#1c1917;text-decoration:none;font-size:14px;font-weight:500;">
                    ${escapeHtml(q.body)}
                  </a>
                  <br>
                  <span style="font-size:12px;color:#a8a29e;">
                    ${q.category ? `${escapeHtml(q.category)} · ` : ''}${count} ${count === 1 ? 'answer' : 'answers'}
                  </span>
                </td>
              </tr>
            `
          }).join('')

          let featuredHtml = ''
          if (featuredAnswers && featuredAnswers.length > 0) {
            const items = featuredAnswers.map(a => `
              <li style="margin-bottom:8px;font-size:14px;color:#44403c;">
                <strong>${escapeHtml(a.profiles?.display_name ?? 'Expert')}</strong> on
                <a href="${siteUrl}/q/${a.questions?.slug}" style="color:#44403c;">"${escapeHtml(a.questions?.body?.slice(0, 50))}..."</a>
              </li>
            `).join('')

            featuredHtml = `
              <h3 style="font-size:15px;color:#1c1917;margin:20px 0 8px;">Featured This Week</h3>
              <ul style="padding-left:20px;margin:0;">${items}</ul>
            `
          }

          const content = `
            <h2 style="font-size:18px;color:#1c1917;margin:0 0 8px;">Your Weekly Recap</h2>
            <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
              Here's what happened on Ethos last week, ${escapeHtml(profile.display_name)}.
            </p>
            <table style="width:100%;border-collapse:collapse;">
              ${questionsHtml}
            </table>
            ${featuredHtml}
            <div style="text-align:center;margin-top:20px;">
              <a href="${siteUrl}" style="display:inline-block;padding:10px 24px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
                Visit Ethos
              </a>
            </div>
          `

          const unsubscribeUrl = getUnsubscribeUrl(profile.unsubscribe_token, 'weekly_recap')
          const { error } = await sendEmail({
            to: email,
            subject: `Ethos Weekly — ${weekQuestions.length} questions from last week`,
            html: emailLayout(content, unsubscribeUrl),
          })

          if (error) { results.errors++ } else { results.weekly_recap++ }
        }
      }
    }
  } catch (err) {
    console.error('[cron] daily-emails error:', err)
    return NextResponse.json({ error: err.message, results }, { status: 500 })
  }

  return NextResponse.json({ success: true, results })
}

function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
```
</task>

<task id="3" title="Add CRON_SECRET to env documentation">
Update `.env.example` (or create if it doesn't exist) to document the new env vars:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=
SENDER_EMAIL=Ethos <onboarding@resend.dev>

# Cron (Vercel)
CRON_SECRET=
```

Note: `CRON_SECRET` is auto-provided by Vercel in production when cron jobs are configured. For local testing, set any string value and pass it as `Authorization: Bearer <value>` header.
</task>

## Verification

- [ ] `vercel.json` has cron entry for `/api/cron/daily-emails` at `0 9 * * *`
- [ ] Cron route rejects requests without valid `CRON_SECRET` (401)
- [ ] Daily question email sent to users with `daily_question: true`
- [ ] Daily email includes question body, category, date, and "Answer now" CTA
- [ ] Budget reset email sent only on 1st of month
- [ ] Budget reset email shows answer limit and month name
- [ ] Weekly recap email sent only on Mondays
- [ ] Weekly recap includes last week's questions with answer counts
- [ ] Weekly recap includes featured answers from last week (if any)
- [ ] Users with preference set to `false` do NOT receive that email type
- [ ] All emails include working unsubscribe link
- [ ] Email subjects are descriptive and include relevant context
- [ ] Missing `RESEND_API_KEY` doesn't crash the cron route
- [ ] `.env.example` documents all required env vars
- [ ] `npm run build` succeeds
