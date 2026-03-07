'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { rateLimit } from '@/lib/rateLimit'

export async function toggleLike(answerId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  // Rate limit: 60 likes per 15 minutes
  const rl = await rateLimit({ key: `like:${user.id}`, limit: 60, windowMs: 15 * 60 * 1000 })
  if (!rl.success) return { error: 'Too many actions. Please slow down.' }

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
    const { error: rpcError } = await supabase.rpc('decrement_like_count', { p_answer_id: answerId })
    if (rpcError) console.error('[likes] Decrement failed:', rpcError)

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
    const { error: rpcError } = await supabase.rpc('increment_like_count', { p_answer_id: answerId })
    if (rpcError) console.error('[likes] Increment failed:', rpcError)

    // Create notification for answer author (fire-and-forget)
    const { data: answer } = await supabase
      .from('answers')
      .select('expert_id')
      .eq('id', answerId)
      .single()
    if (answer && answer.expert_id !== user.id) {
      supabase.from('notifications').insert({
        user_id: answer.expert_id,
        type: 'like',
        actor_id: user.id,
        answer_id: answerId,
      }).then(() => {})
    }

    return { liked: true }
  }
}
