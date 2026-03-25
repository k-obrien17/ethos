'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

export async function createInvite(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const count = parseInt(formData.get('count') || '1', 10)
  if (count < 1 || count > 20) return { error: 'Generate 1-20 codes at a time.' }

  const expiresInDays = parseInt(formData.get('expiresInDays') || '30', 10)
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString()

  const codes = []
  for (let i = 0; i < count; i++) {
    codes.push({
      code: generateCode(),
      created_by: user.id,
      expires_at: expiresAt,
    })
  }

  const { error } = await supabase.from('invites').insert(codes)
  if (error) return { error: 'Failed to create invite codes.' }

  revalidatePath('/admin/invites')
  return { success: true, codes: codes.map(c => c.code) }
}

const MAX_EXPERT_INVITES = 2

export async function createExpertInvite() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  // Check eligibility: at least 1 answer + under invite limit
  const [{ count: answerCount }, { count: existingInvites }] = await Promise.all([
    supabase
      .from('answers')
      .select('*', { count: 'exact', head: true })
      .eq('expert_id', user.id),
    supabase
      .from('invites')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id),
  ])

  if (!answerCount || answerCount < 1) {
    return { error: 'You need to answer at least one question before inviting others.' }
  }

  if ((existingInvites ?? 0) >= MAX_EXPERT_INVITES) {
    return { error: `You have already used your ${MAX_EXPERT_INVITES} invite codes.` }
  }

  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString()

  const { data, error } = await supabase
    .from('invites')
    .insert({
      code: generateCode(),
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select('code')
    .single()

  if (error) return { error: 'Failed to create invite code.' }

  revalidatePath('/dashboard')
  return { success: true, code: data.code }
}
