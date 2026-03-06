'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendEmail, emailLayout } from '@/lib/email'

export async function updateProfile(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' }
  }

  const displayName = formData.get('display_name')?.trim()
  const handle = formData.get('handle')?.trim()?.toLowerCase()
  const headline = formData.get('headline')?.trim() || null
  const bio = formData.get('bio')?.trim() || null
  const organization = formData.get('organization')?.trim() || null
  const linkedinUrl = formData.get('linkedin_url')?.trim() || null
  const twitterUrl = formData.get('twitter_url')?.trim() || null
  const websiteUrl = formData.get('website_url')?.trim() || null

  // Validate display_name
  if (!displayName || displayName.length < 2) {
    return { error: 'Display name must be at least 2 characters.' }
  }
  if (displayName.length > 80) {
    return { error: 'Display name must be under 80 characters.' }
  }

  // Validate handle
  if (!handle || !/^[a-z0-9-]+$/.test(handle)) {
    return { error: 'Handle must contain only lowercase letters, numbers, and hyphens.' }
  }
  if (handle.length < 3 || handle.length > 40) {
    return { error: 'Handle must be 3-40 characters.' }
  }

  // Length limits
  if (headline && headline.length > 120) {
    return { error: 'Headline must be under 120 characters.' }
  }
  if (bio && bio.length > 500) {
    return { error: 'Bio must be under 500 characters.' }
  }
  if (organization && organization.length > 100) {
    return { error: 'Organization must be under 100 characters.' }
  }

  // Get old handle for revalidation
  const { data: oldProfile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      handle,
      headline,
      bio,
      organization,
      linkedin_url: linkedinUrl,
      twitter_url: twitterUrl,
      website_url: websiteUrl,
    })
    .eq('id', user.id)

  if (error) {
    if (error.message.includes('profiles_handle_key') || error.message.includes('duplicate key')) {
      return { error: 'That handle is already taken.' }
    }
    return { error: 'Failed to update profile. Please try again.' }
  }

  // Revalidate pages
  revalidatePath('/dashboard')
  revalidatePath(`/expert/${handle}`)
  if (oldProfile?.handle && oldProfile.handle !== handle) {
    revalidatePath(`/expert/${oldProfile.handle}`)
  }
  revalidatePath('/')

  return { success: true }
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  // Get handle for revalidation
  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .single()

  // Use admin client to delete the auth user
  // This triggers ON DELETE CASCADE: auth.users -> profiles -> answers
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) return { error: 'Failed to delete account. Please try again.' }

  // Revalidate pages that showed this user's data
  revalidatePath('/')
  revalidatePath('/questions')
  if (profile?.handle) revalidatePath(`/expert/${profile.handle}`)

  return { success: true }
}

export async function sendVerificationEmail() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email_verified_at, email_verify_token, display_name')
    .eq('id', user.id)
    .single()

  if (profile?.email_verified_at) return { error: 'Email already verified.' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const verifyUrl = `${siteUrl}/api/verify-email?token=${profile.email_verify_token}`

  const content = `
    <h2 style="font-size:18px;color:#1c1917;margin:0 0 8px;">Verify your email</h2>
    <p style="font-size:14px;color:#44403c;margin:0 0 16px;">
      Hi ${escapeHtml(profile.display_name || 'there')}, please verify your email to start answering questions on Ethos.
    </p>
    <div style="text-align:center;">
      <a href="${verifyUrl}" style="display:inline-block;padding:10px 24px;background-color:#1c1917;color:#fafaf9;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
        Verify email
      </a>
    </div>
    <p style="font-size:12px;color:#a8a29e;margin:16px 0 0;">
      If the button doesn't work, copy and paste this link: ${verifyUrl}
    </p>
  `

  const { error } = await sendEmail({
    to: user.email,
    subject: 'Verify your email — Ethos',
    html: emailLayout(content),
  })

  if (error) return { error: 'Failed to send verification email.' }
  return { success: true }
}

function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function updateEmailPreferences(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const preferences = {
    daily_question: formData.get('daily_question') === 'on',
    weekly_recap: formData.get('weekly_recap') === 'on',
    budget_reset: formData.get('budget_reset') === 'on',
    featured_answer: formData.get('featured_answer') === 'on',
    bookmark_live: formData.get('bookmark_live') === 'on',
  }

  const { error } = await supabase
    .from('profiles')
    .update({ email_preferences: preferences })
    .eq('id', user.id)

  if (error) return { error: 'Failed to update preferences.' }

  revalidatePath('/dashboard/notifications')
  return { success: true }
}
