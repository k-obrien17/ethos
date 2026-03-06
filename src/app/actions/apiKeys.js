'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createHash, randomBytes } from 'crypto'

export async function createApiKey(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const name = formData.get('name')?.trim()
  if (!name || name.length < 1 || name.length > 50) {
    return { error: 'Name must be 1-50 characters.' }
  }

  // Check existing key count (max 5)
  const { count } = await supabase
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('revoked_at', null)

  if (count >= 5) return { error: 'Maximum 5 active API keys.' }

  // Generate key
  const rawKey = `ethos_${randomBytes(24).toString('hex')}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 12)

  const { error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })

  if (error) return { error: 'Failed to create API key.' }

  revalidatePath('/dashboard/api')
  return { success: true, key: rawKey }
}

export async function revokeApiKey(keyId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', user.id)

  if (error) return { error: 'Failed to revoke key.' }

  revalidatePath('/dashboard/api')
  return { success: true }
}
