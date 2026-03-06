'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addComment(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to comment.' }

  const answerId = formData.get('answerId')
  const body = formData.get('body')?.trim()

  if (!answerId) return { error: 'Missing answer ID.' }
  if (!body || body.length < 1) return { error: 'Comment cannot be empty.' }
  if (body.length > 2000) return { error: 'Comment must be under 2,000 characters.' }

  const { error } = await supabase
    .from('answer_comments')
    .insert({ answer_id: answerId, user_id: user.id, body })

  if (error) return { error: 'Failed to post comment.' }

  await supabase.rpc('increment_comment_count', { p_answer_id: answerId })

  revalidatePath('/')
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

  revalidatePath('/')
  return { success: true }
}
