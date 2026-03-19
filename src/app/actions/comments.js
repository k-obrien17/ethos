'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { rateLimit } from '@/lib/rateLimit'

export async function addComment(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to comment.' }

  // Defense-in-depth: verify user has a profile (completed invite flow)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'You must complete your profile to comment.' }

  // Rate limit: 30 comments per 15 minutes
  const rl = await rateLimit({ key: `comment:${user.id}`, limit: 30, windowMs: 15 * 60 * 1000 })
  if (!rl.success) return { error: 'Too many comments. Please slow down.' }

  const answerId = formData.get('answerId')
  const body = formData.get('body')?.trim()
  const parentId = formData.get('parentId') || null

  if (!answerId) return { error: 'Missing answer ID.' }
  if (!body || body.length < 1) return { error: 'Comment cannot be empty.' }
  if (body.length > 2000) return { error: 'Comment must be under 2,000 characters.' }

  const { error } = await supabase
    .from('answer_comments')
    .insert({ answer_id: answerId, user_id: user.id, body, parent_id: parentId })

  if (error) return { error: 'Failed to post comment.' }

  await supabase.rpc('increment_comment_count', { p_answer_id: answerId })

  // Fetch the answer's question slug and author for revalidation + notification
  const { data: answer } = await supabase
    .from('answers')
    .select('expert_id, questions!inner(slug)')
    .eq('id', answerId)
    .single()

  // Notify answer author (fire-and-forget)
  if (answer && answer.expert_id !== user.id) {
    supabase.from('notifications').insert({
      user_id: answer.expert_id,
      type: 'comment',
      actor_id: user.id,
      answer_id: answerId,
      body: body.slice(0, 100),
    }).then(() => {}).catch(err => console.error('[notification]', err))
  }

  // Notify parent comment author on reply (fire-and-forget)
  if (parentId) {
    const { data: parentComment } = await supabase
      .from('answer_comments')
      .select('user_id')
      .eq('id', parentId)
      .single()

    if (
      parentComment &&
      parentComment.user_id !== user.id &&
      parentComment.user_id !== answer?.expert_id
    ) {
      supabase.from('notifications').insert({
        user_id: parentComment.user_id,
        type: 'comment_reply',
        actor_id: user.id,
        answer_id: answerId,
        body: body.slice(0, 100),
      }).then(() => {}).catch(err => console.error('[notification]', err))
    }
  }

  if (answer?.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }
  revalidatePath(`/answers/${answerId}`)
  return { success: true }
}

export async function deleteComment(commentId, answerId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('answer_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to delete comment.' }

  await supabase.rpc('decrement_comment_count', { p_answer_id: answerId })

  const { data: answer } = await supabase
    .from('answers')
    .select('questions!inner(slug)')
    .eq('id', answerId)
    .single()

  if (answer?.questions?.slug) {
    revalidatePath(`/q/${answer.questions.slug}`)
  }
  revalidatePath(`/answers/${answerId}`)
  return { success: true }
}
