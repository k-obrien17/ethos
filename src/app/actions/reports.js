'use server'

import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

export async function submitReport(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const rl = await rateLimit({ key: `report:${user.id}`, limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.success) return { error: 'Too many reports. Please try again later.' }

  const answerId = formData.get('answerId') || null
  const commentId = formData.get('commentId') || null
  const reason = formData.get('reason')
  const details = formData.get('details')?.trim() || null

  if (!answerId && !commentId) return { error: 'Missing report target.' }
  if (!reason) return { error: 'Please select a reason.' }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      answer_id: answerId,
      comment_id: commentId,
      reason,
      details,
    })

  if (error) return { error: 'Failed to submit report.' }
  return { success: true }
}

export async function reviewReport(reportId, action) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const status = action === 'action' ? 'actioned' : action === 'dismiss' ? 'dismissed' : 'reviewed'

  const { error } = await supabase
    .from('reports')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) return { error: 'Failed to update report.' }
  return { success: true }
}
