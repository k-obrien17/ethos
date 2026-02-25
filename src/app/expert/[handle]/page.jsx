import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const { handle } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, headline, bio')
    .eq('handle', handle)
    .single()

  if (!profile) return { title: 'Expert not found' }

  const title = profile.display_name
  const description = profile.headline || profile.bio?.slice(0, 150) || `${profile.display_name} on Ethos`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [{
        url: `/api/og?type=expert&title=${encodeURIComponent(profile.display_name)}&subtitle=${encodeURIComponent(profile.headline ?? '')}&detail=${encodeURIComponent(profile.bio?.slice(0, 80) ?? '')}`,
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ExpertProfilePage({ params }) {
  const { handle } = await params
  const supabase = await createClient()
  const now = new Date()

  // Fetch profile by handle
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', handle)
    .single()

  if (!profile) notFound()

  // Fetch all answers with question context
  const { data: answers } = await supabase
    .from('answers')
    .select(`
      *,
      questions!inner (
        id, body, slug, category, publish_date
      )
    `)
    .eq('expert_id', profile.id)
    .order('created_at', { ascending: false })

  const allAnswers = answers ?? []

  // Monthly stats
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStr = now.toISOString().slice(0, 10)
  const monthlyAnswerCount = allAnswers.filter(a => a.created_at >= startOfMonth).length

  const { count: totalQuestionsThisMonth } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .lte('publish_date', todayStr)
    .gte('publish_date', startOfMonth.slice(0, 10))
    .in('status', ['scheduled', 'published'])

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <section className="flex items-start gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-warm-200 flex items-center justify-center text-warm-600 font-bold text-xl flex-shrink-0">
            {profile.display_name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-warm-900">
            {profile.display_name}
          </h1>
          {profile.headline && (
            <p className="text-warm-600 mt-0.5">{profile.headline}</p>
          )}
          {profile.organization && (
            <p className="text-warm-500 text-sm">{profile.organization}</p>
          )}
          <p className="text-warm-400 text-sm mt-1">@{profile.handle}</p>
          {profile.linkedin_url && (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-warm-500 hover:text-warm-700 mt-1 inline-block"
            >
              LinkedIn
            </a>
          )}
        </div>
      </section>

      {/* Bio */}
      {profile.bio && (
        <section className="text-warm-700 leading-relaxed">
          {profile.bio}
        </section>
      )}

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{allAnswers.length}</p>
          <p className="text-xs text-warm-500 mt-1">Total Answers</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">{monthlyAnswerCount}</p>
          <p className="text-xs text-warm-500 mt-1">This Month</p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
          <p className="text-2xl font-bold text-warm-900">
            {totalQuestionsThisMonth > 0
              ? `${Math.round((monthlyAnswerCount / totalQuestionsThisMonth) * 100)}%`
              : '—'}
          </p>
          <p className="text-xs text-warm-500 mt-1">Selectivity</p>
        </div>
      </section>

      {totalQuestionsThisMonth > 0 && (
        <p className="text-sm text-warm-500 -mt-4">
          Answered {monthlyAnswerCount} of {totalQuestionsThisMonth} questions this month
        </p>
      )}

      {/* Answer archive */}
      <section>
        <h2 className="text-lg font-semibold text-warm-800 mb-4">
          Answers
        </h2>
        {allAnswers.length > 0 ? (
          <div className="space-y-6">
            {allAnswers.map((answer) => (
              <article key={answer.id} className="bg-white rounded-lg border border-warm-200 p-6">
                {/* Question context */}
                <Link
                  href={`/q/${answer.questions.slug}`}
                  className="block mb-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {answer.questions.category && (
                      <span className="text-xs font-medium text-warm-500 uppercase tracking-wide">
                        {answer.questions.category}
                      </span>
                    )}
                    <span className="text-xs text-warm-400">
                      {format(new Date(answer.questions.publish_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="font-semibold text-warm-900 hover:underline">
                    {answer.questions.body}
                  </p>
                </Link>

                {/* Featured badge */}
                {answer.featured_at && (
                  <div className="flex items-center gap-1 mb-3 text-amber-600">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium">Featured</span>
                  </div>
                )}

                {/* Answer body */}
                <div className="text-warm-800 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:text-warm-700 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mb-1">
                  <ReactMarkdown>{answer.body}</ReactMarkdown>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-warm-100 text-xs text-warm-400">
                  <span>{answer.word_count} words</span>
                  <Link
                    href={`/answers/${answer.id}`}
                    className="hover:text-warm-600"
                  >
                    Link
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-warm-500 text-sm text-center py-8">
            No answers yet.
          </p>
        )}
      </section>
    </div>
  )
}
