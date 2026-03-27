import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import AnswerCard from '@/components/AnswerCard'
import ShareButton from '@/components/ShareButton'
import ViewTracker from '@/components/ViewTracker'
import Avatar from '@/components/Avatar'

export const revalidate = 300

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: answer } = await supabase
    .from('answers')
    .select(`
      body,
      profiles!answers_expert_id_fkey ( display_name ),
      questions!inner ( body )
    `)
    .eq('id', id)
    .single()

  if (!answer) return { title: 'Answer not found' }

  const expertName = answer.profiles?.display_name ?? 'Expert'
  const questionBody = answer.questions?.body ?? 'a question'
  const excerpt = answer.body?.slice(0, 150) ?? ''
  const title = `${expertName} on "${questionBody}"`

  return {
    title,
    description: excerpt,
    alternates: { canonical: `/answers/${id}` },
    openGraph: {
      title,
      description: excerpt,
      type: 'article',
      images: [{
        url: `/api/og?type=answer&title=${encodeURIComponent(expertName)}&subtitle=${encodeURIComponent(questionBody)}&detail=${encodeURIComponent(excerpt)}`,
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: excerpt,
    },
  }
}

export default async function AnswerPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch answer with expert profile and question context
  const { data: answer } = await supabase
    .from('answers')
    .select(`
      *,
      profiles!answers_expert_id_fkey (
        id,
        display_name,
        handle,
        avatar_url,
        answer_limit,
        organization
      ),
      questions!inner (
        id,
        body,
        slug,
        category,
        publish_date,
        question_topics(topics(name, slug))
      )
    `)
    .eq('id', id)
    .single()

  if (!answer) notFound()

  // Get current user for edit capability
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch comments for this answer
  const { data: comments } = await supabase
    .from('answer_comments')
    .select('*, profiles(display_name, handle, avatar_url)')
    .eq('answer_id', id)
    .order('created_at', { ascending: true })

  // Parallel: like status + more from expert + other perspectives
  const [likeResult, { data: moreFromExpert }, { data: otherPerspectives }] = await Promise.all([
    user
      ? supabase
          .from('answer_likes')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('answer_id', id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('answers')
      .select(`
        id, body, like_count, created_at,
        questions!inner(body, slug, publish_date)
      `)
      .eq('expert_id', answer.profiles?.id)
      .neq('id', answer.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('answers')
      .select(`
        id, body, like_count, created_at,
        profiles!answers_expert_id_fkey(display_name, handle, avatar_url)
      `)
      .eq('question_id', answer.questions?.id)
      .neq('id', answer.id)
      .order('like_count', { ascending: false })
      .limit(4),
  ])

  const isLiked = !!likeResult.data

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://credo-daily.vercel.app'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${answer.profiles?.display_name} on "${answer.questions?.body}"`,
    articleBody: answer.body,
    datePublished: answer.created_at,
    author: {
      '@type': 'Person',
      name: answer.profiles?.display_name,
      url: `${BASE_URL}/expert/${answer.profiles?.handle}`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Credo',
      url: BASE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}/answers/${answer.id}`,
    },
  }

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Question context */}
      <div>
        <Link
          href={`/q/${answer.questions.slug}`}
          className="text-sm text-warm-500 hover:text-warm-700"
        >
          &larr; Back to question
        </Link>
        <div className="mt-3 p-4 bg-warm-100 rounded-lg">
          <p className="text-xs font-medium text-warm-500 uppercase tracking-wide">
            {answer.questions.category && `${answer.questions.category} · `}
            {format(new Date(answer.questions.publish_date), 'MMMM d, yyyy')}
          </p>
          <p className="text-lg font-semibold text-warm-900 mt-1">
            {answer.questions.body}
          </p>
          {answer.questions.question_topics?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {answer.questions.question_topics.map((qt) => qt.topics && (
                <Link
                  key={qt.topics.slug}
                  href={`/topics/${qt.topics.slug}`}
                  className="text-xs px-2 py-0.5 rounded-full bg-warm-100 text-warm-600 font-medium hover:bg-warm-200 transition-colors"
                >
                  {qt.topics.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* The answer */}
      <AnswerCard
        answer={answer}
        expert={answer.profiles}
        monthlyUsage={null}
        currentUserId={user?.id}
        featured={!!answer.featured_at}
        isLiked={isLiked}
        comments={comments ?? []}
        editWindowExpiresAt={new Date(answer.created_at).getTime() + 15 * 60 * 1000}
      />

      {/* Share utility bar */}
      <div className="flex items-center justify-center">
        <ShareButton url={`/answers/${id}`} title={`${answer.profiles?.display_name || 'Expert'} on Credo`} />
      </div>

      {/* More from this expert */}
      {(moreFromExpert ?? []).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-warm-800">
              More from {answer.profiles?.display_name}
            </h3>
            <Link
              href={`/expert/${answer.profiles.handle}`}
              className="text-xs text-accent-600 hover:text-accent-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-warm-100">
            {moreFromExpert.map((a) => (
              <div key={a.id} className="py-3">
                <Link href={`/q/${a.questions?.slug}`} className="text-sm font-medium text-warm-900 hover:text-accent-600 transition-colors leading-snug">
                  {a.questions?.body}
                </Link>
                <p className="text-sm text-warm-500 mt-1 leading-relaxed">
                  {a.body.replace(/[#*_~`>\[\]()!|-]/g, '').slice(0, 150).trim()}{a.body.length > 150 ? '...' : ''}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-warm-400">
                  <span>{format(new Date(a.created_at), 'MMM d, yyyy')}</span>
                  {(a.like_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      {a.like_count}
                    </span>
                  )}
                  <Link href={`/answers/${a.id}`} className="text-accent-600 hover:text-accent-700 font-medium ml-auto">
                    Read
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Other perspectives on this question */}
      {(otherPerspectives ?? []).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-warm-800">
              Other perspectives on this question
            </h3>
            <Link
              href={`/q/${answer.questions.slug}`}
              className="text-xs text-accent-600 hover:text-accent-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-warm-100">
            {otherPerspectives.map((a) => (
              <div key={a.id} className="py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar src={a.profiles?.avatar_url} alt={a.profiles?.display_name || 'Expert'} size={32} />
                  <Link href={`/expert/${a.profiles?.handle}`} className="text-sm font-medium text-warm-700 hover:text-warm-900">
                    {a.profiles?.display_name}
                  </Link>
                </div>
                <p className="text-sm text-warm-500 leading-relaxed">
                  {a.body.replace(/[#*_~`>\[\]()!|-]/g, '').slice(0, 200).trim()}{a.body.length > 200 ? '...' : ''}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-warm-400">
                  {(a.like_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      {a.like_count}
                    </span>
                  )}
                  <Link href={`/answers/${a.id}`} className="text-accent-600 hover:text-accent-700 font-medium ml-auto">
                    Read
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ViewTracker answerId={id} />
    </div>
  )
}
