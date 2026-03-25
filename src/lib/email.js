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

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error('[email] Invalid recipient:', to)
    return { error: 'Invalid email address' }
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
  return `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}&type=${encodeURIComponent(type)}`
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
