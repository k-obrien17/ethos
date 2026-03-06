'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { rateLimit } from '@/lib/rateLimit'

export async function toggleFollow(targetUserId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }
  if (user.id === targetUserId) return { error: "You can't follow yourself." }

  const rl = rateLimit({ key: `follow:${user.id}`, limit: 30, windowMs: 15 * 60 * 1000 })
  if (!rl.success) return { error: 'Too many actions. Please slow down.' }

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)

    if (error) return { error: 'Failed to unfollow.' }

    await Promise.all([
      supabase.rpc('decrement_follower_count', { p_user_id: targetUserId }),
      supabase.rpc('decrement_following_count', { p_user_id: user.id }),
    ])

    return { following: false }
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetUserId })

    if (error) {
      if (error.message.includes('duplicate')) return { following: true }
      return { error: 'Failed to follow.' }
    }

    await Promise.all([
      supabase.rpc('increment_follower_count', { p_user_id: targetUserId }),
      supabase.rpc('increment_following_count', { p_user_id: user.id }),
    ])

    // Notification (fire-and-forget)
    supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'follow',
      actor_id: user.id,
    }).then(() => {})

    return { following: true }
  }
}
