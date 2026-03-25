import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApiKeyManager from '@/components/ApiKeyManager'

export const metadata = { title: 'API Keys' }

export default async function ApiKeysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ethos-daily.vercel.app'

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-warm-500 hover:text-warm-700">
          &larr; Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-warm-900 mt-3">API Keys</h1>
        <p className="text-sm text-warm-500 mt-1">
          Access the Credo public API to embed your answers on your website.
        </p>
      </div>

      <ApiKeyManager keys={keys ?? []} />

      <section className="bg-warm-50 rounded-lg border border-warm-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-warm-900">API Endpoints</h2>
        <p className="text-xs text-warm-500">
          Pass your key as <code className="bg-warm-100 px-1 py-0.5 rounded">Authorization: Bearer ethos_...</code>
        </p>
        <div className="space-y-3 text-sm">
          <div>
            <code className="text-xs bg-warm-100 px-2 py-1 rounded text-warm-700">
              GET {siteUrl}/api/v1/questions
            </code>
            <p className="text-xs text-warm-500 mt-1">List published questions (latest first)</p>
          </div>
          <div>
            <code className="text-xs bg-warm-100 px-2 py-1 rounded text-warm-700">
              GET {siteUrl}/api/v1/questions/:slug
            </code>
            <p className="text-xs text-warm-500 mt-1">Get a question with answers</p>
          </div>
          <div>
            <code className="text-xs bg-warm-100 px-2 py-1 rounded text-warm-700">
              GET {siteUrl}/api/v1/experts/:handle
            </code>
            <p className="text-xs text-warm-500 mt-1">Get an expert profile with answers</p>
          </div>
          <div>
            <code className="text-xs bg-warm-100 px-2 py-1 rounded text-warm-700">
              GET {siteUrl}/api/v1/answers/:id
            </code>
            <p className="text-xs text-warm-500 mt-1">Get a single answer</p>
          </div>
        </div>
      </section>
    </div>
  )
}
