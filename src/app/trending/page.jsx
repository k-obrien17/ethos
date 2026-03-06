import { createClient } from '@/lib/supabase/server'
import { subDays } from 'date-fns'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import ShareButton from '@/components/ShareButton'

export const revalidate = 300

export const metadata = {
  title: 'Trending',
  description: 'Most-liked answers on Ethos this week.',
}

export default async function TrendingPage() {
  const supabase = await createClient()
  const sevenDaysAgo = subDays(new Date(), 7).toISOString()

  const { data: answers } = await supabase
    .from('answers')
    .select(`
      id, body, word_count, like_count, comment_count, featured_at, created_at,
      profiles!answers_expert_id_fkey(display_name, handle, avatar_url, headline),
      questions!inner(body, slug, category, publish_date)
    `)
    .gte('created_at', sevenDaysAgo)
    .order('like_count', { ascending: false })
    .limit(20)

  const trending = (answers ?? []).filter(a => (a.like_count ?? 0) > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900">Trending</h1>
        <p className="text-warm-500 text-sm mt-1">Most-liked answers from the past 7 days</p>
      </div>

      {trending.length > 0 ? (
        <div className="space-y-4">
          {trending.map((answer, i) => (
            <article key={answer.id} className="bg-white rounded-lg border border-warm-200 p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-lg font-bold text-warm-300 w-6 flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {/* Question context */}
                  <Link href={`/q/${answer.questions.slug}`} className="block mb-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      {answer.questions.category && (
                        <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                          {answer.questions.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-warm-900 hover:underline">
                      {answer.questions.body}
                    </p>
                  </Link>

                  {/* Expert */}
                  <Link href={`/expert/${answer.profiles.handle}`} className="flex items-center gap-2 mb-3">
                    {answer.profiles.avatar_url ? (
                      <img src={answer.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-warm-200 flex items-center justify-center text-warm-500 text-xs font-medium">
                        {answer.profiles.display_name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-warm-700">{answer.profiles.display_name}</span>
                    {answer.profiles.headline && (
                      <span className="text-xs text-warm-400 hidden sm:inline">{answer.profiles.headline}</span>
                    )}
                  </Link>

                  {/* Featured badge */}
                  {answer.featured_at && (
                    <div className="flex items-center gap-1 mb-2 text-xs font-medium text-accent-600">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 1l2.39 6.34H19l-5.3 3.85L15.3 18 10 13.82 4.7 18l1.61-6.81L1 7.34h6.61L10 1z" />
                      </svg>
                      Featured
                    </div>
                  )}

                  {/* Answer preview */}
                  <div className="prose-answer text-sm">
                    <ReactMarkdown>
                      {answer.body.length > 400 ? answer.body.slice(0, 400) + '...' : answer.body}
                    </ReactMarkdown>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-warm-100 text-xs text-warm-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        {answer.like_count ?? 0}
                      </span>
                      <span>{answer.comment_count ?? 0} comments</span>
                      <span>{answer.word_count} words</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShareButton url={`/answers/${answer.id}`} title={`${answer.profiles.display_name} on Ethos`} />
                      <Link href={`/answers/${answer.id}`} className="hover:text-warm-600">
                        Read more
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-warm-500">No trending answers this week yet.</p>
          <p className="text-warm-400 text-sm mt-1">Like answers to help surface the best ones.</p>
        </div>
      )}
    </div>
  )
}
