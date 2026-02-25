import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import EditableAnswerCard from '@/components/EditableAnswerCard'
import ShareButton from '@/components/ShareButton'

export const revalidate = 3600

export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: answer } = await supabase
    .from('answers')
    .select(`
      body,
      profiles!inner ( display_name ),
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
      profiles!inner (
        id,
        display_name,
        handle,
        avatar_url,
        answer_limit
      ),
      questions!inner (
        id,
        body,
        slug,
        category,
        publish_date
      )
    `)
    .eq('id', id)
    .single()

  if (!answer) notFound()

  // Get current user for edit capability
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
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
        </div>
      </div>

      {/* The answer */}
      <EditableAnswerCard
        answer={answer}
        expert={answer.profiles}
        monthlyUsage={null}
        currentUserId={user?.id}
      />

      {/* Link to see all answers + share */}
      <div className="flex items-center justify-center gap-4">
        <Link
          href={`/q/${answer.questions.slug}`}
          className="text-sm text-warm-600 hover:text-warm-800"
        >
          See all answers to this question &rarr;
        </Link>
        <ShareButton />
      </div>
    </div>
  )
}
