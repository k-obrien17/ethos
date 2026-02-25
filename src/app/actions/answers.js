'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitAnswer(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to answer.' }
  }

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('answer_limit')
    .eq('id', user.id)
    .single()

  if (count >= (profile?.answer_limit ?? 3)) {
    return { error: 'You have used all your answers this month.' }
  }

  // Layer 3: Database advisory lock function (absolute enforcement)
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

  // Revalidate cached pages so the new answer appears
  revalidatePath('/')
  revalidatePath('/questions')

  // Revalidate the specific question page
  const { data: question } = await supabase
    .from('questions')
    .select('slug')
    .eq('id', questionId)
    .single()

  if (question?.slug) {
    revalidatePath(`/q/${question.slug}`)
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

  // Revalidate affected pages
  revalidatePath(`/answers/${answerId}`)
  if (answer.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }
  revalidatePath('/')

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
    .select('featured_at, question_id, questions!inner(slug)')
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
