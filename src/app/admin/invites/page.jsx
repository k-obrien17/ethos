import { createClient } from '@/lib/supabase/server'
import InviteGenerator from '@/components/admin/InviteGenerator'

export const metadata = { title: 'Manage Invites' }

export default async function AdminInvitesPage() {
  const supabase = await createClient()

  const { data: invites } = await supabase
    .from('invites')
    .select(`
      id, code, claimed_at, expires_at, created_at,
      creator:profiles!invites_created_by_fkey(display_name),
      claimer:profiles!invites_claimed_by_fkey(display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const available = (invites || []).filter(i => !i.claimed_by && (!i.expires_at || new Date(i.expires_at) > new Date()))
  const claimed = (invites || []).filter(i => i.claimed_at)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-warm-900">Invite Codes</h1>

      <InviteGenerator />

      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Available ({available.length})
        </h2>
        {available.length > 0 ? (
          <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
            {available.map(invite => (
              <div key={invite.id} className="px-4 py-3 flex items-center justify-between">
                <code className="text-sm font-mono font-bold text-warm-900">{invite.code}</code>
                <div className="flex items-center gap-3 text-xs text-warm-500">
                  {invite.expires_at && (
                    <span>Expires {new Date(invite.expires_at).toLocaleDateString()}</span>
                  )}
                  <span>{new Date(invite.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-warm-500">No available invite codes. Generate some above.</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-warm-500 uppercase tracking-wide mb-3">
          Claimed ({claimed.length})
        </h2>
        {claimed.length > 0 ? (
          <div className="bg-white border border-warm-200 rounded-lg divide-y divide-warm-100">
            {claimed.map(invite => (
              <div key={invite.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <code className="text-sm font-mono text-warm-500 line-through">{invite.code}</code>
                  <span className="ml-2 text-sm text-warm-700">
                    claimed by {invite.claimer?.display_name || 'Unknown'}
                  </span>
                </div>
                <span className="text-xs text-warm-400">
                  {new Date(invite.claimed_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-warm-500">No claimed invites yet.</p>
        )}
      </section>
    </div>
  )
}
