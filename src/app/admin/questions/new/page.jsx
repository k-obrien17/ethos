import { createClient } from '@/lib/supabase/server'
import QuestionForm from '@/components/admin/QuestionForm'

export const metadata = { title: 'New Question — Admin' }

export default async function NewQuestionPage() {
  const supabase = await createClient()

  const { data: topics } = await supabase
    .from('topics')
    .select('id, name')
    .order('name', { ascending: true })

  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-6">New Question</h1>
      <QuestionForm topics={topics || []} />
    </div>
  )
}
