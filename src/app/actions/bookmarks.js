'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleBookmark(questionId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }
  if (!questionId) return { error: 'Missing question ID.' }

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('question_id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('question_id', questionId)

    if (error) return { error: 'Failed to remove bookmark.' }

    revalidatePath('/dashboard')
    revalidatePath('/questions/upcoming')
    return { success: true, bookmarked: false }
  } else {
    // Add bookmark
    const { error } = await supabase
      .from('bookmarks')
      .insert({ user_id: user.id, question_id: questionId })

    if (error) {
      if (error.message.includes('duplicate key')) {
        return { success: true, bookmarked: true }
      }
      return { error: 'Failed to save bookmark.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/questions/upcoming')
    return { success: true, bookmarked: true }
  }
}
