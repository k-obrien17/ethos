import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import QuestionForm from '@/components/admin/QuestionForm'

export const metadata = { title: 'Edit Question — Admin' }

export default async function EditQuestionPage({ params }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()

  if (!question) notFound()

  // Fetch all topics for the picker
  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .order('name', { ascending: true })

  // Fetch this question's current topic assignments
  const { data: questionTopics } = await supabase
    .from('question_topics')
    .select('topic_id')
    .eq('question_id', id)

  const selectedTopicIds = (questionTopics || []).map((qt) => qt.topic_id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-6">Edit Question</h1>
      <QuestionForm
        question={question}
        topics={topics || []}
        selectedTopicIds={selectedTopicIds}
      />
    </div>
  )
}
