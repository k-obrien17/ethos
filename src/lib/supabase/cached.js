import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export const getCachedTopics = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('topics')
      .select('id, name, slug')
      .order('name')
    return data ?? []
  },
  ['topics-list'],
  { revalidate: 300, tags: ['topics'] }
)

export function getCachedSiteSettings(key) {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle()
      return data?.value ?? null
    },
    ['site-settings', key],
    { revalidate: 300, tags: ['site-settings'] }
  )()
}
