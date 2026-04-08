import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Avatar from '@/components/Avatar'

export const revalidate = 3600

export const metadata = {
  title: 'Credo for Companies — Elevate Your Leadership Visibility',
  description: 'Put your leaders on the platform that fuels how AI understands your industry. Credo turns expert perspectives into structured knowledge that trains the next generation of LLMs.',
}

export default async function ForCompaniesPage() {
  const supabase = await createClient()

  // Parallel fetch: profiles with orgs + answer stats + a real enriched demo answer
  const [{ data: profiles }, { data: answers }, { data: demoAnswer }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, handle, avatar_url, headline, organization')
      .not('organization', 'is', null),
    supabase
      .from('answers')
      .select('expert_id, like_count'),
    supabase
      .from('answers')
      .select(`
        id, summary, key_claims, sentiment,
        profiles!answers_expert_id_fkey(display_name, handle, organization),
        questions!inner(body, slug)
      `)
      .eq('enrichment_version', 1)
      .not('summary', 'is', null)
      .not('key_claims', 'is', null)
      .order('like_count', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Fetch claims + frameworks for demo answer if one was found
  let demoClaims = []
  let demoFrameworks = []
  if (demoAnswer?.id) {
    const [claimsResult, frameworksResult] = await Promise.all([
      supabase
        .from('claims')
        .select('text, claim_type, domain')
        .eq('source_answer_id', demoAnswer.id)
        .limit(4),
      supabase
        .from('frameworks')
        .select('name, summary')
        .eq('source_answer_id', demoAnswer.id)
        .limit(2),
    ])
    demoClaims = claimsResult.data ?? []
    demoFrameworks = frameworksResult.data ?? []
  }

  // Group experts by organization
  const orgMap = {}
  for (const p of profiles ?? []) {
    const org = p.organization?.trim()
    if (!org) continue
    if (!orgMap[org]) orgMap[org] = []
    orgMap[org].push(p)
  }

  const expertStats = {}
  for (const a of answers ?? []) {
    if (!expertStats[a.expert_id]) expertStats[a.expert_id] = { answers: 0, likes: 0 }
    expertStats[a.expert_id].answers++
    expertStats[a.expert_id].likes += a.like_count ?? 0
  }

  // Build company cards sorted by total engagement
  const companies = Object.entries(orgMap)
    .map(([name, experts]) => {
      const totalAnswers = experts.reduce((sum, e) => sum + (expertStats[e.id]?.answers ?? 0), 0)
      const totalLikes = experts.reduce((sum, e) => sum + (expertStats[e.id]?.likes ?? 0), 0)
      return { name, experts, totalAnswers, totalLikes }
    })
    .filter(c => c.totalAnswers > 0)
    .sort((a, b) => b.totalLikes - a.totalLikes || b.totalAnswers - a.totalAnswers)

  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="text-center">
        <p className="text-xs font-medium text-accent-600 uppercase tracking-widest mb-3">For Companies</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-warm-900 leading-tight tracking-tight">
          Your leaders should be shaping<br />how AI understands your industry
        </h1>
        <p className="text-warm-500 mt-4 max-w-xl mx-auto text-lg leading-relaxed">
          Credo turns executive perspectives into structured knowledge that trains LLMs.
          When someone asks AI about your domain, your people are the source.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <a
            href="mailto:hello@credo.today?subject=Credo for Companies"
            className="px-6 py-2.5 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors"
          >
            Get your team on Credo
          </a>
          <Link
            href="/join"
            className="text-warm-500 text-sm font-medium hover:text-warm-800 transition-colors"
          >
            Individual expert? Join here
          </Link>
        </div>
      </section>

      {/* What happens */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-warm-200 p-6">
          <p className="text-2xl font-bold text-accent-600 mb-2">1</p>
          <h3 className="font-semibold text-warm-900 mb-2">Your expert answers a question</h3>
          <p className="text-sm text-warm-500 leading-relaxed">
            One curated question per day. Your leader picks the ones in their wheelhouse and shares their genuine perspective.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-6">
          <p className="text-2xl font-bold text-accent-600 mb-2">2</p>
          <h3 className="font-semibold text-warm-900 mb-2">We decompose it into knowledge</h3>
          <p className="text-sm text-warm-500 leading-relaxed">
            Every answer is broken into claims, frameworks, and evidence — structured data that AI models can learn from and attribute.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-6">
          <p className="text-2xl font-bold text-accent-600 mb-2">3</p>
          <h3 className="font-semibold text-warm-900 mb-2">Your brand enters the AI layer</h3>
          <p className="text-sm text-warm-500 leading-relaxed">
            When AI assistants answer questions about your industry, your leaders&apos; expertise is in the training data — attributed and authentic.
          </p>
        </div>
      </section>

      {/* Live proof — real decomposition from a real answer */}
      {demoAnswer && (demoClaims.length > 0 || demoFrameworks.length > 0) && (
        <section>
          <div className="text-center mb-6">
            <p className="text-xs font-medium text-accent-600 uppercase tracking-widest mb-2">Live from the platform</p>
            <h2 className="text-xl font-bold text-warm-900">Here&apos;s what the knowledge graph actually looks like</h2>
            <p className="text-warm-500 text-sm mt-2 max-w-lg mx-auto">
              Not a mockup. This is the structured output from a real answer on Credo, automatically extracted at submission time.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-warm-200 overflow-hidden">
            {/* Source answer context */}
            <div className="p-5 border-b border-warm-100">
              <p className="text-xs font-medium text-warm-400 uppercase tracking-widest mb-1">Question</p>
              <p className="text-sm font-semibold text-warm-900 mb-3">{demoAnswer.questions.body}</p>
              <p className="text-xs text-warm-500">
                Answered by{' '}
                <Link href={`/expert/${demoAnswer.profiles?.handle}`} className="text-warm-700 font-medium hover:text-accent-600">
                  {demoAnswer.profiles?.display_name}
                </Link>
                {demoAnswer.profiles?.organization && ` at ${demoAnswer.profiles.organization}`}
              </p>
              {demoAnswer.summary && (
                <p className="text-sm text-warm-600 mt-3 italic leading-relaxed">
                  &ldquo;{demoAnswer.summary}&rdquo;
                </p>
              )}
            </div>

            {/* Extracted claims */}
            {demoClaims.length > 0 && (
              <div className="p-5 border-b border-warm-100">
                <p className="text-xs font-medium text-warm-400 uppercase tracking-widest mb-3">Extracted claims ({demoClaims.length})</p>
                <div className="space-y-2">
                  {demoClaims.map((claim, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-xs font-mono text-accent-600 mt-0.5">→</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-warm-800 leading-snug">{claim.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-warm-100 text-warm-500 font-mono">{claim.claim_type}</span>
                          {claim.domain && <span className="text-xs text-warm-400">{claim.domain}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted frameworks */}
            {demoFrameworks.length > 0 && (
              <div className="p-5">
                <p className="text-xs font-medium text-warm-400 uppercase tracking-widest mb-3">Extracted frameworks ({demoFrameworks.length})</p>
                <div className="space-y-3">
                  {demoFrameworks.map((fw, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-xs font-mono text-accent-600 mt-0.5">◇</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-warm-900">{fw.name}</p>
                        <p className="text-xs text-warm-500 mt-0.5 leading-snug">{fw.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-warm-400 text-center mt-4 max-w-lg mx-auto">
            Every claim, framework, and piece of evidence is attributed to the expert who made it. This is what feeds downstream AI systems.
          </p>
        </section>
      )}

      {/* Why it matters */}
      <section className="bg-warm-50 rounded-lg border border-warm-200 p-8">
        <h2 className="text-xl font-bold text-warm-900 mb-6 text-center">Why this matters now</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div>
            <h3 className="font-semibold text-warm-900 mb-1">AI is replacing Google</h3>
            <p className="text-sm text-warm-500 leading-relaxed">
              People increasingly ask AI instead of searching. If your experts aren&apos;t in the training data, your perspective doesn&apos;t exist.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-warm-900 mb-1">SEO is dying. Attribution is next</h3>
            <p className="text-sm text-warm-500 leading-relaxed">
              Structured, attributed knowledge graphs are how AI will cite sources. Credo builds that graph around your people.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-warm-900 mb-1">Scarcity creates signal</h3>
            <p className="text-sm text-warm-500 leading-relaxed">
              Your leader gets 3 answers per month. Every response is a deliberate statement of expertise, not a content mill.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-warm-900 mb-1">Engagement you can measure</h3>
            <p className="text-sm text-warm-500 leading-relaxed">
              Likes, comments, and follower growth — real signals that your leader&apos;s perspective resonates with peers.
            </p>
          </div>
        </div>
      </section>

      {/* Companies already on Credo */}
      {companies.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-warm-900 mb-2 text-center">Companies on Credo</h2>
          <p className="text-warm-500 text-sm text-center mb-6">Leaders from these organizations are already shaping the conversation.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {companies.map((company) => (
              <div key={company.name} className="bg-white rounded-lg border border-warm-200 p-5">
                <h3 className="font-semibold text-warm-900 mb-3">{company.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  {company.experts.slice(0, 3).map((expert) => (
                    <Link key={expert.id} href={`/expert/${expert.handle}`}>
                      <Avatar src={expert.avatar_url} alt={expert.display_name} size={32} />
                    </Link>
                  ))}
                  {company.experts.length > 3 && (
                    <span className="text-xs text-warm-400">+{company.experts.length - 3} more</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-warm-500">
                  <span>{company.experts.length} {company.experts.length === 1 ? 'expert' : 'experts'}</span>
                  <span>{company.totalAnswers} {company.totalAnswers === 1 ? 'answer' : 'answers'}</span>
                  <span>{company.totalLikes} {company.totalLikes === 1 ? 'like' : 'likes'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="text-center">
        <h2 className="text-xl font-bold text-warm-900 mb-3">Get your leaders on the platform</h2>
        <p className="text-warm-500 mb-6 text-sm max-w-md mx-auto">
          We work with companies to onboard their senior leaders. One expert per company to start — expand as you see results.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="mailto:hello@credo.today?subject=Credo for Companies"
            className="px-6 py-2.5 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors"
          >
            Contact us
          </a>
          <Link
            href="/experts"
            className="px-6 py-2.5 bg-warm-100 text-warm-700 rounded-md text-sm font-medium hover:bg-warm-200 transition-colors"
          >
            Browse current experts
          </Link>
        </div>
      </section>
    </div>
  )
}
