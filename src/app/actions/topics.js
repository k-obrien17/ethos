'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export async function createTopic(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const name = formData.get('name')?.trim()
  const description = formData.get('description')?.trim() || null

  if (!name || name.length < 2) return { error: 'Topic name must be at least 2 characters.' }
  if (name.length > 50) return { error: 'Topic name must be under 50 characters.' }

  const slug = generateSlug(name)
  if (!slug) return { error: 'Could not generate a valid slug from that name.' }

  const { error } = await supabase
    .from('topics')
    .insert({ name, slug, description })

  if (error) {
    if (error.message.includes('duplicate key') || error.message.includes('topics_name_key') || error.message.includes('topics_slug_key')) {
      return { error: 'A topic with that name already exists.' }
    }
    return { error: 'Failed to create topic.' }
  }

  revalidatePath('/admin/topics')
  revalidatePath('/')
  revalidatePath('/questions')

  return { success: true }
}

export async function deleteTopic(topicId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', topicId)

  if (error) return { error: 'Failed to delete topic.' }

  revalidatePath('/admin/topics')
  revalidatePath('/')
  revalidatePath('/questions')

  return { success: true }
}

export async function followTopic(topicId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to follow topics.' }

  const { error } = await supabase
    .from('topic_follows')
    .upsert(
      { user_id: user.id, topic_id: topicId },
      { onConflict: 'user_id,topic_id' }
    )

  if (error) return { error: 'Failed to follow topic.' }

  revalidatePath('/topics')
  revalidatePath('/')

  return { success: true }
}

export async function unfollowTopic(topicId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to unfollow topics.' }

  const { error } = await supabase
    .from('topic_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('topic_id', topicId)

  if (error) return { error: 'Failed to unfollow topic.' }

  revalidatePath('/topics')
  revalidatePath('/')

  return { success: true }
}

export async function setQuestionTopics(questionId, topicIds) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Admin access required.' }

  if (!Array.isArray(topicIds) || topicIds.length > 3) {
    return { error: 'You can assign at most 3 topics to a question.' }
  }

  // Validate UUID format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  for (const id of topicIds) {
    if (!uuidPattern.test(id)) {
      return { error: 'Invalid topic ID.' }
    }
  }

  // Delete existing assignments
  const { error: deleteError } = await supabase
    .from('question_topics')
    .delete()
    .eq('question_id', questionId)

  if (deleteError) return { error: 'Failed to update topic assignments.' }

  // Insert new assignments
  if (topicIds.length > 0) {
    const rows = topicIds.map((topicId) => ({
      question_id: questionId,
      topic_id: topicId,
    }))

    const { error: insertError } = await supabase
      .from('question_topics')
      .insert(rows)

    if (insertError) return { error: 'Failed to assign topics.' }
  }

  revalidatePath('/admin/questions')
  revalidatePath('/questions')
  revalidatePath('/')

  return { success: true }
}
