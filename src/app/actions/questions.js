'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function generateSlug(body) {
  return body
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

export async function createQuestion(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const body = formData.get('body')?.trim()
  const slug = formData.get('slug')?.trim()?.toLowerCase() || generateSlug(body)
  const category = formData.get('category')?.trim() || null
  const publishDate = formData.get('publish_date') || null
  const status = formData.get('status') || 'draft'

  // Validate
  if (!body || body.length < 10) return { error: 'Question must be at least 10 characters.' }
  if (body.length > 500) return { error: 'Question must be under 500 characters.' }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { error: 'Slug must contain only lowercase letters, numbers, and hyphens.' }
  if (slug.length < 3 || slug.length > 80) return { error: 'Slug must be 3-80 characters.' }
  if (status === 'scheduled' && !publishDate) return { error: 'Scheduled questions need a publish date.' }
  if (!['draft', 'scheduled', 'published'].includes(status)) return { error: 'Invalid status.' }

  const { data, error } = await supabase
    .from('questions')
    .insert({
      body,
      slug,
      category,
      publish_date: publishDate,
      status,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    if (error.message.includes('questions_slug_key') || error.message.includes('duplicate key')) {
      return { error: 'That slug is already taken.' }
    }
    return { error: 'Failed to create question.' }
  }

  // Assign topics if provided
  const topicIdsRaw = formData.get('topic_ids')
  if (topicIdsRaw && data?.id) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const topicIds = topicIdsRaw.split(',').filter((id) => uuidPattern.test(id.trim()))
    if (topicIds.length > 0 && topicIds.length <= 3) {
      const rows = topicIds.map((topicId) => ({
        question_id: data.id,
        topic_id: topicId.trim(),
      }))
      await supabase.from('question_topics').insert(rows)
    }
  }

  revalidatePath('/admin/questions')
  revalidatePath('/questions')
  revalidatePath('/')
  redirect('/admin/questions')
}

export async function updateQuestion(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const questionId = formData.get('question_id')
  const body = formData.get('body')?.trim()
  const slug = formData.get('slug')?.trim()?.toLowerCase()
  const category = formData.get('category')?.trim() || null
  const publishDate = formData.get('publish_date') || null
  const status = formData.get('status') || 'draft'

  if (!questionId) return { error: 'Question ID required.' }
  if (!body || body.length < 10) return { error: 'Question must be at least 10 characters.' }
  if (body.length > 500) return { error: 'Question must be under 500 characters.' }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { error: 'Slug must contain only lowercase letters, numbers, and hyphens.' }
  if (slug.length < 3 || slug.length > 80) return { error: 'Slug must be 3-80 characters.' }
  if (status === 'scheduled' && !publishDate) return { error: 'Scheduled questions need a publish date.' }

  // Get old slug for revalidation
  const { data: oldQuestion } = await supabase
    .from('questions')
    .select('slug')
    .eq('id', questionId)
    .single()

  const { error } = await supabase
    .from('questions')
    .update({ body, slug, category, publish_date: publishDate, status })
    .eq('id', questionId)

  if (error) {
    if (error.message.includes('questions_slug_key') || error.message.includes('duplicate key')) {
      return { error: 'That slug is already taken.' }
    }
    return { error: 'Failed to update question.' }
  }

  // Update topic assignments
  const topicIdsRaw = formData.get('topic_ids')
  if (topicIdsRaw !== null) {
    // Delete existing topic assignments
    await supabase.from('question_topics').delete().eq('question_id', questionId)

    // Insert new ones if provided
    if (topicIdsRaw) {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const topicIds = topicIdsRaw.split(',').filter((id) => uuidPattern.test(id.trim()))
      if (topicIds.length > 0 && topicIds.length <= 3) {
        const rows = topicIds.map((topicId) => ({
          question_id: questionId,
          topic_id: topicId.trim(),
        }))
        await supabase.from('question_topics').insert(rows)
      }
    }
  }

  revalidatePath('/admin/questions')
  revalidatePath(`/q/${slug}`)
  if (oldQuestion?.slug && oldQuestion.slug !== slug) {
    revalidatePath(`/q/${oldQuestion.slug}`)
  }
  revalidatePath('/questions')
  revalidatePath('/')

  return { success: true }
}

export async function deleteQuestion(questionId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  // Get question details for revalidation
  const { data: question } = await supabase
    .from('questions')
    .select('slug, status')
    .eq('id', questionId)
    .single()

  // Only allow deleting draft/scheduled questions
  if (question?.status === 'published') {
    return { error: 'Cannot delete published questions. Change status to draft first.' }
  }

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId)

  if (error) return { error: 'Failed to delete question.' }

  revalidatePath('/admin/questions')
  revalidatePath('/questions')
  revalidatePath('/')
  if (question?.slug) revalidatePath(`/q/${question.slug}`)

  return { success: true }
}

export async function rescheduleQuestion(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const questionId = formData.get('question_id')
  const publishDate = formData.get('publish_date')

  if (!questionId) return { error: 'Question ID required.' }
  if (!publishDate) return { error: 'Publish date required.' }

  const { error } = await supabase
    .from('questions')
    .update({
      publish_date: publishDate,
      status: 'scheduled',
    })
    .eq('id', questionId)

  if (error) return { error: 'Failed to reschedule question.' }

  revalidatePath('/admin')
  revalidatePath('/admin/questions')
  revalidatePath('/questions')
  revalidatePath('/')

  return { success: true }
}
