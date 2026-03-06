'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveDraft(questionId, body) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }
  if (!body?.trim()) {
    // Delete draft if body is empty
    await supabase
      .from('answer_drafts')
      .delete()
      .eq('user_id', user.id)
      .eq('question_id', questionId)
    return { success: true }
  }

  const { error } = await supabase
    .from('answer_drafts')
    .upsert({
      user_id: user.id,
      question_id: questionId,
      body: body.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,question_id' })

  if (error) return { error: 'Failed to save draft.' }
  return { success: true }
}

export async function deleteDraft(questionId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  await supabase
    .from('answer_drafts')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId)

  return { success: true }
}
