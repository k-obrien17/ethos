import { createClient } from '@/lib/supabase/server'
import CreateTopicForm from './CreateTopicForm'
import DeleteTopicButton from './DeleteTopicButton'

export const metadata = { title: 'Topics — Admin' }

export default async function AdminTopicsPage() {
  const supabase = await createClient()

  const { data: topics } = await supabase
    .from('topics')
    .select('*, question_topics(count)')
    .order('name', { ascending: true })

  const allTopics = topics || []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-900">
          Topics
          <span className="text-warm-400 font-normal text-lg ml-2">
            ({allTopics.length})
          </span>
        </h1>
      </div>

      {/* Create topic form */}
      <div className="bg-white border border-warm-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-warm-700 mb-3">
          Add Topic
        </h2>
        <CreateTopicForm />
      </div>

      {/* Topics list */}
      {allTopics.length > 0 ? (
        <div className="bg-white border border-warm-200 rounded-lg px-4">
          {allTopics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-start justify-between gap-4 py-3 border-b border-warm-100 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-warm-900">
                  {topic.name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-warm-400 font-mono">
                    {topic.slug}
                  </span>
                  <span className="text-xs text-warm-400">
                    {topic.question_topics?.[0]?.count ?? 0} questions
                  </span>
                </div>
                {topic.description && (
                  <p className="text-xs text-warm-500 mt-1">
                    {topic.description}
                  </p>
                )}
              </div>
              <DeleteTopicButton topicId={topic.id} topicName={topic.name} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-warm-500 text-sm">
          No topics yet. Create your first topic above.
        </p>
      )}
    </div>
  )
}
