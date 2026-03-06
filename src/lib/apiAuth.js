import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'

export async function validateApiKey(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const rawKey = authHeader.slice(7)
  if (!rawKey.startsWith('ethos_')) return null

  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const supabase = createAdminClient()

  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (!apiKey) return null

  // Update last_used_at (fire-and-forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)
    .then(() => {})

  return apiKey
}
