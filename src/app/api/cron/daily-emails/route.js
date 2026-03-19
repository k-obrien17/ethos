import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, emailLayout, getUnsubscribeUrl } from '@/lib/email'
import { NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'
import { timingSafeEqual } from 'crypto'

function safeCompare(a, b) {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function GET(request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization')
  if (!safeCompare(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const isFirstOfMonth = today.getDate() === 1
  const isMonday = today.getDay() === 1

  const results = { daily: 0, budget_reset: 0, weekly_recap: 0, bookmark_live: 0, notification_digest: 0, errors: 0 }

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // === Daily Question Email ===
    if (todayQuestion) {
      const questionUrl = `${siteUrl}/q/${todayQuestion.slug}`

      for (const profile of profiles) {
        if (!profile.email_preferences?.daily_question) continue
        const email = emailMap[profile.id]
        if (!email) continue

        const content = `
          <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
            Good morning, ${escapeHtml(profile.display_name || 'there')}. Today's question is ready.
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

    // === Bookmark Goes Live Email ===
    if (todayQuestion) {
      // Find users who bookmarked today's question
      const { data: bookmarkUsers } = await admin
        .from('bookmarks')
        .select('user_id')
        .eq('question_id', todayQuestion.id)

      if (bookmarkUsers && bookmarkUsers.length > 0) {
        const questionUrl = `${siteUrl}/q/${todayQuestion.slug}`

        for (const bookmark of bookmarkUsers) {
          const profile = profiles.find(p => p.id === bookmark.user_id)
          if (!profile) continue
          if (!profile.email_preferences?.bookmark_live) continue
          const email = emailMap[profile.id]
          if (!email) continue

          const content = `
            <h2 style="font-size:18px;color:#1c1917;margin:0 0 8px;">A question you saved is live!</h2>
            <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
              ${escapeHtml(profile.display_name || 'there')}, a question you bookmarked is now open for answers.
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

          const unsubscribeUrl = getUnsubscribeUrl(profile.unsubscribe_token, 'bookmark_live')
          const { error } = await sendEmail({
            to: email,
            subject: `Your saved question is live: ${todayQuestion.body.slice(0, 50)}${todayQuestion.body.length > 50 ? '...' : ''}`,
            html: emailLayout(content, unsubscribeUrl),
          })

          if (error) { results.errors++ } else { results.bookmark_live++ }
        }
      }
    }

    // === Budget Reset Email (1st of month) ===
    if (isFirstOfMonth) {
      for (const profile of profiles) {
        if (!profile.email_preferences?.budget_reset) continue
        const email = emailMap[profile.id]
        if (!email) continue

        const dashboardUrl = `${siteUrl}/dashboard`

        const content = `
          <h2 style="font-size:18px;color:#1c1917;margin:0 0 8px;">Your answer budget has reset</h2>
          <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
            Happy ${format(today, 'MMMM')}, ${escapeHtml(profile.display_name || 'there')}! You have ${profile.answer_limit} fresh answers to use this month.
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
          profiles!answers_expert_id_fkey (display_name),
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
              Here's what happened on Ethos last week, ${escapeHtml(profile.display_name || 'there')}.
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
    // === Activity Notification Digest ===
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    for (const profile of profiles) {
      const email = emailMap[profile.id]
      if (!email) continue

      // Check which notification email types they opted into
      const prefs = profile.email_preferences || {}
      const enabledTypes = []
      if (prefs.comments_email) enabledTypes.push('comment')
      if (prefs.comment_replies_email) enabledTypes.push('comment_reply')
      if (prefs.follows_email) enabledTypes.push('follow')
      if (prefs.followed_expert_posts_email) enabledTypes.push('followed_expert_posted')
      // Note: featured_answer email is already handled in real-time by toggleFeaturedAnswer, skip here

      if (enabledTypes.length === 0) continue

      const { data: unreadNotifs } = await admin
        .from('notifications')
        .select(`
          type, body, created_at,
          actor:profiles!notifications_actor_id_fkey(display_name),
          answer:answers!notifications_answer_id_fkey(id, body, questions(slug, body))
        `)
        .eq('user_id', profile.id)
        .is('read_at', null)
        .in('type', enabledTypes)
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!unreadNotifs || unreadNotifs.length === 0) continue

      const notifItems = unreadNotifs.map(n => {
        const actor = escapeHtml(n.actor?.display_name || 'Someone')
        const questionBody = n.answer?.questions?.body
        const questionSlug = n.answer?.questions?.slug
        let action = ''
        switch (n.type) {
          case 'comment': action = 'commented on your answer'; break
          case 'comment_reply': action = 'replied to your comment'; break
          case 'follow': action = 'started following you'; break
          case 'followed_expert_posted': action = 'posted a new answer'; break
        }
        let context = ''
        if (questionBody && questionSlug) {
          context = ` on <a href="${siteUrl}/q/${questionSlug}" style="color:#44403c;">"${escapeHtml(questionBody.slice(0, 50))}${questionBody.length > 50 ? '...' : ''}"</a>`
        }
        return `<li style="margin-bottom:8px;font-size:14px;color:#44403c;"><strong>${actor}</strong> ${action}${context}</li>`
      }).join('')

      const content = `
        <h2 style="font-size:18px;color:#1c1917;margin:0 0 8px;">Activity on Ethos</h2>
        <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
          Hi ${escapeHtml(profile.display_name || 'there')}, here's what happened since your last visit.
        </p>
        <ul style="padding-left:20px;margin:0 0 20px;">${notifItems}</ul>
        <div style="text-align:center;">
          <a href="${siteUrl}/dashboard/notifications" style="display:inline-block;padding:10px 24px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
            View all notifications
          </a>
        </div>
      `

      const unsubscribeUrl = getUnsubscribeUrl(profile.unsubscribe_token, 'notification_digest')
      const { error } = await sendEmail({
        to: email,
        subject: `${unreadNotifs.length} new notification${unreadNotifs.length > 1 ? 's' : ''} on Ethos`,
        html: emailLayout(content, unsubscribeUrl),
      })

      if (error) { results.errors++ } else { results.notification_digest++ }
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
