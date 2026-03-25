'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail, emailLayout, getUnsubscribeUrl } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectAI } from '@/lib/aiDetection'
import { rateLimit } from '@/lib/rateLimit'
import { enrichAnswer } from '@/lib/enrichment'

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
        Congratulations, ${escapeHtml(profile.display_name || 'there')}. Your answer to the question below has been selected as an editorial pick on Credo.
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
      subject: 'Your answer was featured on Credo!',
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

export async function submitAnswer(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to answer.' }
  }

  // Rate limit: 10 submissions per hour per user
  const rl = await rateLimit({ key: `submit:${user.id}`, limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.success) return { error: 'Too many submissions. Please try again later.' }

  const questionId = formData.get('questionId')
  const body = formData.get('body')?.trim()

  // Basic validation
  if (!questionId) {
    return { error: 'Missing question ID.' }
  }

  if (!body || body.length < 10) {
    return { error: 'Answer must be at least 10 characters.' }
  }

  if (body.length > 10000) {
    return { error: 'Answer must be under 10,000 characters.' }
  }

  // Layer 1.5: Profile status + email verification check
  const { data: profile } = await supabase
    .from('profiles')
    .select('answer_limit, email_verified_at, status')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'suspended') {
    return { error: 'Your account has been suspended.' }
  }

  if (profile?.status === 'pending') {
    return { error: 'Your account is pending approval. An admin will review your profile shortly.' }
  }

  if (!profile?.email_verified_at) {
    return { error: 'Please verify your email before submitting answers. Check your dashboard.' }
  }

  // Layer 2: Server-side budget check (fast reject before DB function)
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString()

  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)
    .gte('created_at', startOfMonth)

  if (count >= (profile?.answer_limit ?? 3)) {
    return { error: 'You have used all your answers this month.' }
  }

  // Layer 2.5: Question answer cap and deadline check
  const { data: questionCheck } = await supabase
    .from('questions')
    .select('answer_cap, answer_deadline')
    .eq('id', questionId)
    .single()

  if (questionCheck?.answer_deadline && new Date(questionCheck.answer_deadline) < new Date()) {
    return { error: 'The answer window for this question has closed.' }
  }

  if (questionCheck?.answer_cap) {
    const { count: answerCount } = await supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('question_id', questionId)

    if ((answerCount ?? 0) >= questionCheck.answer_cap) {
      return { error: 'This question has reached its answer limit.' }
    }
  }

  // Layer 3: AI detection (human-only enforcement)
  const aiCheck = await detectAI(body, user.id)
  if (aiCheck.flagged) {
    return {
      error: 'This answer was flagged as AI-generated. Credo is a human-only platform. Please write your answer in your own words.',
      aiRejected: true,
    }
  }

  // Layer 4: Database advisory lock function (absolute enforcement)
  const { data, error } = await supabase.rpc('submit_answer', {
    p_expert_id: user.id,
    p_question_id: questionId,
    p_body: body,
  })

  if (error) {
    if (error.message.includes('Monthly answer limit reached')) {
      return { error: 'You have used all your answers this month.' }
    }
    if (
      error.message.includes('duplicate key') ||
      error.message.includes('idx_answers_expert_question')
    ) {
      return { error: 'You have already answered this question.' }
    }
    return { error: 'Failed to submit answer. Please try again.' }
  }

  // Revalidate the specific question page and homepage (shows today's answers)
  const { data: question } = await supabase
    .from('questions')
    .select('slug')
    .eq('id', questionId)
    .single()

  if (question?.slug) {
    revalidatePath(`/q/${question.slug}`)
  }
  revalidatePath('/')

  // Enrich answer with LLM (fire-and-forget)
  if (data?.id) enrichAnswer(data.id).catch(err => console.error('[enrichment]', err))

  // Notify followers (fire-and-forget)
  const admin = createAdminClient()
  const { data: followers } = await admin
    .from('follows')
    .select('follower_id')
    .eq('following_id', user.id)

  if (followers && followers.length > 0) {
    const notifications = followers.map(f => ({
      user_id: f.follower_id,
      type: 'followed_expert_posted',
      actor_id: user.id,
      answer_id: data?.id,
    }))
    admin.from('notifications').insert(notifications).then(() => {}).catch(err => console.error('[notification]', err))
  }

  return { success: true, answerId: data?.id }
}

export async function editAnswer(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const answerId = formData.get('answerId')
  const body = formData.get('body')?.trim()

  if (!answerId) return { error: 'Missing answer ID.' }
  if (!body || body.length < 10) return { error: 'Answer must be at least 10 characters.' }
  if (body.length > 10000) return { error: 'Answer must be under 10,000 characters.' }

  // Email verification check (same as submitAnswer)
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_verified_at')
    .eq('id', user.id)
    .single()

  if (!profile?.email_verified_at) {
    return { error: 'Please verify your email before editing answers.' }
  }

  // Fetch the answer to verify ownership and time window
  const { data: answer } = await supabase
    .from('answers')
    .select('expert_id, created_at, question_id, questions!inner(slug)')
    .eq('id', answerId)
    .single()

  if (!answer) return { error: 'Answer not found.' }
  if (answer.expert_id !== user.id) return { error: 'You can only edit your own answers.' }

  // Enforce 15-minute edit window
  const createdAt = new Date(answer.created_at)
  const now = new Date()
  const diffMinutes = (now - createdAt) / (1000 * 60)

  if (diffMinutes > 15) {
    return { error: 'Edit window has closed. Answers can only be edited within 15 minutes of submission.' }
  }

  // Recalculate word count
  const wordCount = body.split(/\s+/).filter(Boolean).length

  // Update the answer
  const { error } = await supabase
    .from('answers')
    .update({ body, word_count: wordCount, updated_at: new Date().toISOString() })
    .eq('id', answerId)

  if (error) return { error: 'Failed to update answer. Please try again.' }

  // Re-enrich after edit (fire-and-forget)
  enrichAnswer(answerId).catch(err => console.error('[enrichment]', err))

  // Revalidate affected pages
  revalidatePath(`/answers/${answerId}`)
  if (answer.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }

  return { success: true }
}

export async function toggleAnswerVisibility(answerId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  // Get current state
  const { data: answer } = await supabase
    .from('answers')
    .select('hidden_at, question_id, questions(slug)')
    .eq('id', answerId)
    .single()

  if (!answer) return { error: 'Answer not found.' }

  const isHidden = !!answer.hidden_at

  const { error } = await supabase
    .from('answers')
    .update({
      hidden_at: isHidden ? null : new Date().toISOString(),
      hidden_by: isHidden ? null : user.id,
    })
    .eq('id', answerId)

  if (error) return { error: 'Failed to update answer visibility.' }

  revalidatePath('/admin/answers')
  revalidatePath(`/answers/${answerId}`)
  if (answer.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }
  revalidatePath('/')

  return { success: true, hidden: !isHidden }
}

export async function toggleFeaturedAnswer(answerId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  // Get current state + question context
  const { data: answer } = await supabase
    .from('answers')
    .select('featured_at, question_id, expert_id, questions!inner(slug)')
    .eq('id', answerId)
    .single()

  if (!answer) return { error: 'Answer not found.' }

  const isFeatured = !!answer.featured_at

  if (isFeatured) {
    // Unfeature this answer
    const { error } = await supabase
      .from('answers')
      .update({ featured_at: null, featured_by: null })
      .eq('id', answerId)

    if (error) return { error: 'Failed to unfeature answer.' }
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

    // In-app notification (fire-and-forget)
    supabase.from('notifications').insert({
      user_id: answer.expert_id,
      type: 'featured',
      actor_id: user.id,
      answer_id: answerId,
    }).then(() => {}).catch(err => console.error('[notification]', err))
  }

  // Revalidate affected pages
  revalidatePath('/admin/answers')
  revalidatePath(`/answers/${answerId}`)
  if (answer.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }
  revalidatePath('/')

  return { success: true, featured: !isFeatured }
}
