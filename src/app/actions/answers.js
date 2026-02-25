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
