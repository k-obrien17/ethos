'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleLike(answerId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  // Check if already liked
  const { data: existing } = await supabase
    .from('answer_likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('answer_id', answerId)
    .maybeSingle()

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('answer_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('answer_id', answerId)

    if (error) return { error: 'Failed to unlike.' }

    // Decrement count
    await supabase.rpc('decrement_like_count', { p_answer_id: answerId })

    return { liked: false }
  } else {
    // Like
    const { error } = await supabase
      .from('answer_likes')
      .insert({ user_id: user.id, answer_id: answerId })

    if (error) {
      if (error.message.includes('duplicate')) return { liked: true }
      return { error: 'Failed to like.' }
    }

    // Increment count
    await supabase.rpc('increment_like_count', { p_answer_id: answerId })

    return { liked: true }
  }
}
