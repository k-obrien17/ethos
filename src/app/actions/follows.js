'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { rateLimit } from '@/lib/rateLimit'

export async function toggleFollow(targetUserId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }
  if (user.id === targetUserId) return { error: "You can't follow yourself." }

  const rl = await rateLimit({ key: `follow:${user.id}`, limit: 30, windowMs: 15 * 60 * 1000 })
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

    // Await both RPCs and handle errors — if either fails, log but don't break
    const [followerResult, followingResult] = await Promise.all([
      supabase.rpc('decrement_follower_count', { p_user_id: targetUserId }),
      supabase.rpc('decrement_following_count', { p_user_id: user.id }),
    ])

    if (followerResult.error || followingResult.error) {
      console.error('[follows] Count decrement failed:', followerResult.error, followingResult.error)
    }

    return { following: false }
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetUserId })

    if (error) {
      if (error.message.includes('duplicate')) return { following: true }
      return { error: 'Failed to follow.' }
    }

    // Await both RPCs
    const [followerResult, followingResult] = await Promise.all([
      supabase.rpc('increment_follower_count', { p_user_id: targetUserId }),
      supabase.rpc('increment_following_count', { p_user_id: user.id }),
    ])

    if (followerResult.error || followingResult.error) {
      console.error('[follows] Count increment failed:', followerResult.error, followingResult.error)
    }

    // Notification (fire-and-forget is acceptable here — not a count)
    supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'follow',
      actor_id: user.id,
    }).then(() => {}).catch(err => console.error('[notification]', err))

    return { following: true }
  }
}
