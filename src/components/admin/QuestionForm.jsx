'use client'

import { useState, useActionState } from 'react'
import { createQuestion, updateQuestion } from '@/app/actions/questions'

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

export default function QuestionForm({ question, topics = [], selectedTopicIds = [] }) {
  const isEdit = !!question
  const action = isEdit ? updateQuestion : createQuestion
  const [state, formAction, pending] = useActionState(action, null)

  const [body, setBody] = useState(question?.body ?? '')
  const [slug, setSlug] = useState(question?.slug ?? '')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEdit)
  const [status, setStatus] = useState(question?.status ?? 'draft')
  const [selectedTopics, setSelectedTopics] = useState(selectedTopicIds)

  function handleBodyChange(e) {
    const newBody = e.target.value
    setBody(newBody)
    if (!isEdit && !slugManuallyEdited) {
      setSlug(generateSlug(newBody))
    }
  }

  function handleSlugChange(e) {
    const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(newSlug)
    setSlugManuallyEdited(true)
  }

  function toggleTopic(topicId) {
    setSelectedTopics((prev) => {
      if (prev.includes(topicId)) {
        return prev.filter((id) => id !== topicId)
      }
      if (prev.length >= 3) return prev
      return [...prev, topicId]
    })
  }

  const statusBadgeClasses = {
    draft: 'bg-warm-100 text-warm-600',
    scheduled: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
  }

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      {isEdit && (
        <input type="hidden" name="question_id" value={question.id} />
      )}

      {/* Hidden input for topic IDs */}
      <input type="hidden" name="topic_ids" value={selectedTopics.join(',')} />

      {/* Body */}
      <div>
        <label htmlFor="body" className="block text-sm font-medium text-warm-700 mb-1">
          Question Body
        </label>
        <textarea
          id="body"
          name="body"
          value={body}
          onChange={handleBodyChange}
          required
          minLength={10}
          maxLength={500}
          rows={4}
          placeholder="What leadership principle do you find hardest to practice consistently?"
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300 resize-y"
        />
        <p className="text-xs text-warm-400 mt-1">
          {body.length}/500 characters
        </p>
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-warm-700 mb-1">
          Slug
        </label>
        <div className="flex items-center gap-1">
          <span className="text-warm-500 text-sm">/q/</span>
          <input
            id="slug"
            name="slug"
            type="text"
            value={slug}
            onChange={handleSlugChange}
            required
            minLength={3}
            maxLength={80}
            placeholder="what-leadership-principle"
            className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300"
          />
        </div>
        <p className="text-xs text-warm-400 mt-1">
          Auto-generated from body text. Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-warm-700 mb-1">
          Category
        </label>
        <input
          id="category"
          name="category"
          type="text"
          defaultValue={question?.category ?? ''}
          placeholder="leadership"
          className="w-full px-3 py-2 border border-warm-200 rounded-lg text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300"
        />
      </div>

      {/* Topics */}
      {topics.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-warm-700 mb-1">
            Topics (up to 3)
          </label>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => {
              const isSelected = selectedTopics.includes(topic.id)
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-warm-800 text-warm-50'
                      : 'border border-warm-300 text-warm-600 hover:border-warm-400 hover:text-warm-700'
                  }`}
                >
                  {topic.name}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-warm-400 mt-1.5">
            {selectedTopics.length}/3 selected
          </p>
        </div>
      )}

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-warm-700 mb-1">
          Status
        </label>
        <div className="flex items-center gap-3">
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-warm-200 rounded-lg text-warm-900 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClasses[status]}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Publish Date */}
      <div>
        <label htmlFor="publish_date" className="block text-sm font-medium text-warm-700 mb-1">
          Publish Date
          {status === 'scheduled' && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
        <input
          id="publish_date"
          name="publish_date"
          type="date"
          defaultValue={question?.publish_date ?? ''}
          required={status === 'scheduled'}
          className="px-3 py-2 border border-warm-200 rounded-lg text-warm-900 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-300"
        />
        {status === 'scheduled' && (
          <p className="text-xs text-warm-400 mt-1">
            Required for scheduled questions.
          </p>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending
            ? (isEdit ? 'Saving...' : 'Creating...')
            : (isEdit ? 'Save Changes' : 'Create Question')
          }
        </button>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
          Question updated.
        </p>
      )}
    </form>
  )
}
