'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function setFeaturedExpert(expertId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const { error } = await supabase
    .from('site_settings')
    .update({ value: expertId, updated_at: new Date().toISOString() })
    .eq('key', 'featured_expert_id')

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/experts')
  return { success: true }
}

export async function clearFeaturedExpert() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const { error } = await supabase
    .from('site_settings')
    .update({ value: null, updated_at: new Date().toISOString() })
    .eq('key', 'featured_expert_id')

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/experts')
  return { success: true }
}
