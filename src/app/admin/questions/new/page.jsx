import QuestionForm from '@/components/admin/QuestionForm'

export const metadata = { title: 'New Question — Admin — Ethos' }

export default function NewQuestionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-warm-900 mb-6">New Question</h1>
      <QuestionForm />
    </div>
  )
}
