---
phase: 8
plan: "02"
title: "Featured answer email notification"
wave: 2
depends_on: ["01"]
requirements: ["EMAL-05"]
files_modified:
  - "src/app/actions/answers.js"
autonomous: true
estimated_tasks: 2
---

# Plan 02: Featured answer email notification

## Objective

When an admin features an answer, send an email notification to the expert whose answer was picked. Respects the user's `featured_answer` email preference. Uses the email infrastructure from Plan 01.

## must_haves

- Expert receives email when their answer is featured (EMAL-05)
- Email includes: question text, a congratulations message, and link to the answer
- Email respects `featured_answer` preference (opt-out honored)
- Email includes unsubscribe link in footer
- No email sent when unfeaturing (only on feature action)

## Tasks

<task id="1" title="Add sendFeaturedEmail helper">
Add a helper function at the top of `src/app/actions/answers.js` (after existing imports):

```javascript
import { sendEmail, emailLayout, getUnsubscribeUrl } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'
```

Add the helper function (before the exported functions):

```javascript
async function sendFeaturedEmail(answerId, expertId) {
  try {
    const admin = createAdminClient()

    // Check expert's email preferences
    const { data: profile } = await admin
      .from('profiles')
      .select('email_preferences, unsubscribe_token, display_name')
      .eq('id', expertId)
      .single()

    if (!profile?.email_preferences?.featured_answer) return

    // Get expert's email from auth.users
    const { data: { user: expertUser } } = await admin.auth.admin.getUserById(expertId)
    if (!expertUser?.email) return

    // Get answer + question context
    const { data: answer } = await admin
      .from('answers')
      .select('body, questions!inner(body, slug)')
      .eq('id', answerId)
      .single()

    if (!answer) return

    const answerUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/answers/${answerId}`
    const unsubscribeUrl = getUnsubscribeUrl(profile.unsubscribe_token, 'featured_answer')

    const content = `
      <h2 style="font-size:18px;color:#1c1917;margin:0 0 8px;">Your answer was featured!</h2>
      <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
        Congratulations, ${profile.display_name}. Your answer to the question below has been selected as an editorial pick on Ethos.
      </p>
      <div style="background-color:#faf9f7;border-radius:6px;padding:16px;margin:0 0 16px;">
        <p style="font-size:12px;color:#a8a29e;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Question</p>
        <p style="font-size:15px;color:#1c1917;font-weight:600;margin:0;">${escapeHtml(answer.questions.body)}</p>
      </div>
      <p style="font-size:14px;color:#44403c;margin:0 0 20px;">
        ${escapeHtml(answer.body.slice(0, 200))}${answer.body.length > 200 ? '...' : ''}
      </p>
      <div style="text-align:center;">
        <a href="${answerUrl}" style="display:inline-block;padding:10px 24px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
          View your featured answer
        </a>
      </div>
    `

    await sendEmail({
      to: expertUser.email,
      subject: 'Your answer was featured on Ethos!',
      html: emailLayout(content, unsubscribeUrl),
    })
  } catch (err) {
    // Email failure should not break the feature action
    console.error('[email] Featured notification failed:', err)
  }
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

Key details:
- Uses admin client for both profile query (bypass RLS for unsubscribe_token) and auth.admin (for email)
- Checks `email_preferences.featured_answer` before sending
- Includes question context, answer preview (200 chars), and CTA link
- HTML-escapes user content to prevent injection
- Wrapped in try/catch — email failure must NOT break the feature action
- `escapeHtml` helper prevents XSS in email templates
</task>

<task id="2" title="Hook email into toggleFeaturedAnswer">
In the `toggleFeaturedAnswer` function, after the successful feature block (after setting featured_at/featured_by and before revalidation), add the email call:

Find the section after `// Feature this answer` succeeds (the else block that sets featured_at), and after the `if (error) return` check, add:

```javascript
    // Send notification email to the expert (fire-and-forget)
    sendFeaturedEmail(answerId, answer.expert_id)
```

Note: This needs access to `answer.expert_id`. The current select is:
```javascript
.select('featured_at, question_id, questions!inner(slug)')
```

Update the select to also include `expert_id`:
```javascript
.select('featured_at, question_id, expert_id, questions!inner(slug)')
```

The email is fire-and-forget (no await) — we don't want email failures to delay the admin's response. The try/catch in `sendFeaturedEmail` ensures errors are logged but don't propagate.

Full change to the else block (featuring):
```javascript
  } else {
    // Clear any existing featured answer for this question first
    const { error: clearError } = await supabase
      .from('answers')
      .update({ featured_at: null, featured_by: null })
      .eq('question_id', answer.question_id)
      .not('featured_at', 'is', null)

    if (clearError) return { error: 'Failed to clear existing featured answer.' }

    // Feature this answer
    const { error } = await supabase
      .from('answers')
      .update({
        featured_at: new Date().toISOString(),
        featured_by: user.id,
      })
      .eq('id', answerId)

    if (error) return { error: 'Failed to feature answer.' }

    // Send notification email to the expert (fire-and-forget)
    sendFeaturedEmail(answerId, answer.expert_id)
  }
```
</task>

## Verification

- [ ] Featuring an answer sends email to the expert
- [ ] Email includes question text, answer preview, and "View your featured answer" button
- [ ] Email has branded Ethos layout with warm palette
- [ ] Email includes working unsubscribe link in footer
- [ ] Unfeaturing does NOT send an email
- [ ] Expert with `featured_answer: false` in preferences does NOT receive email
- [ ] Missing RESEND_API_KEY logs warning but does not break the feature action
- [ ] Email failure does not break the feature action (try/catch + fire-and-forget)
- [ ] `npm run build` succeeds
