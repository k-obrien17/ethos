---
phase: 3
plan: "03"
title: "Profile editing — Server Action, edit form, dashboard enhancement"
wave: 2
depends_on: ["01", "02"]
requirements: ["PROF-02"]
files_modified:
  - "src/app/actions/profile.js"
  - "src/components/EditProfileForm.jsx"
  - "src/app/dashboard/page.jsx"
autonomous: true
estimated_tasks: 4
---

# Plan 03: Profile editing — Server Action, edit form, dashboard enhancement

## Objective

Build the profile editing experience: a Server Action that validates and saves profile changes, a Client Component form for editing display name, handle, headline, bio, and organization, and an enhanced dashboard page that serves as the expert's home base. This plan depends on Plan 01 (headline and organization columns exist) and Plan 02 (public profile page exists for preview link and revalidation).

## must_haves

- Expert can edit display_name, handle, headline, bio, and organization from the dashboard (PROF-02)
- Handle validation: lowercase letters, numbers, hyphens only, 3-40 chars, unique
- Handle uniqueness enforced with friendly error message ("That handle is already taken")
- Field length limits: headline 120 chars, bio 500 chars, organization 100 chars, display_name 2+ chars
- Form shows loading state during save
- Error and success messages display clearly
- Dashboard shows profile preview, stats, and link to public profile
- Dashboard is authenticated-only (redirect to /login if not signed in)
- Successful save revalidates the public profile page and dashboard

## Tasks

<task id="1" title="Create updateProfile Server Action">
Create `src/app/actions/profile.js` with the `updateProfile` Server Action.

```javascript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
```

Key details:
- `prevState` first param for `useActionState` compatibility
- Fetches old handle before update for revalidation of both old and new profile URLs
- Handle validation rejects special chars and enforces length
- UNIQUE constraint violation on handle is caught and returned as friendly error
- Empty strings converted to `null` for headline, bio, organization
- `updated_at` trigger fires automatically on update
</task>

<task id="2" title="Create EditProfileForm client component" depends_on="1">
Create `src/components/EditProfileForm.jsx` — a Client Component form for editing profile fields.

```jsx
'use client'

import { useState, useActionState } from 'react'
import { updateProfile } from '@/app/actions/profile'

export default function EditProfileForm({ profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, null)
  const [handle, setHandle] = useState(profile.handle)

  return (
    <form action={formAction} className="space-y-4">
      {/* Display Name */}
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-warm-700 mb-1">
          Display Name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={profile.display_name}
          required
          minLength={2}
          maxLength={80}
          className="w-full px-3 py-2 border border-warm-200 rounded-lg ..."
        />
      </div>

      {/* Handle */}
      <div>
        <label htmlFor="handle" className="block text-sm font-medium text-warm-700 mb-1">
          Handle
        </label>
        <div className="flex items-center gap-1">
          <span className="text-warm-500 text-sm">@</span>
          <input
            id="handle"
            name="handle"
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            required
            minLength={3}
            maxLength={40}
            className="w-full px-3 py-2 border border-warm-200 rounded-lg ..."
          />
        </div>
        <p className="text-xs text-warm-400 mt-1">
          Your profile URL: /expert/{handle}
        </p>
      </div>

      {/* Headline */}
      <div>
        <label htmlFor="headline" className="block text-sm font-medium text-warm-700 mb-1">
          Headline
        </label>
        <input
          id="headline"
          name="headline"
          type="text"
          defaultValue={profile.headline ?? ''}
          maxLength={120}
          placeholder="VP of Engineering at Acme"
          className="w-full px-3 py-2 border border-warm-200 rounded-lg ..."
        />
      </div>

      {/* Organization */}
      <div>
        <label htmlFor="organization" className="block text-sm font-medium text-warm-700 mb-1">
          Organization
        </label>
        <input
          id="organization"
          name="organization"
          type="text"
          defaultValue={profile.organization ?? ''}
          maxLength={100}
          placeholder="Acme Corp"
          className="w-full px-3 py-2 border border-warm-200 rounded-lg ..."
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-warm-700 mb-1">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ''}
          rows={3}
          maxLength={500}
          placeholder="Tell others about your expertise..."
          className="w-full px-3 py-2 border border-warm-200 rounded-lg resize-y ..."
        />
      </div>

      {/* Submit button + messages */}
      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium ..."
        >
          {pending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded">Profile updated.</p>
      )}
    </form>
  )
}
```

Props:
- `profile`: full profile object with all fields (display_name, handle, headline, bio, organization)

Features:
- Handle input auto-lowercases and strips invalid characters on change
- Shows preview of profile URL below handle input
- All fields have maxLength attributes matching server-side validation
- Loading state on submit button
- Error and success messages from Server Action state
</task>

<task id="3" title="Enhance dashboard page with edit form and stats" depends_on="2">
Rewrite `src/app/dashboard/page.jsx` to show:
1. Profile preview (avatar, name, headline, stats)
2. Link to public profile page
3. Inline edit form (EditProfileForm component)
4. Monthly stats (answers used, budget remaining, selectivity)

The dashboard is a Server Component that fetches profile data and passes it to the EditProfileForm Client Component.

```jsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EditProfileForm from '@/components/EditProfileForm'

export const metadata = {
  title: 'Dashboard — Ethos',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Monthly stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStr = now.toISOString().slice(0, 10)

  const { count: monthlyAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)
    .gte('created_at', startOfMonth)

  const { count: totalAnswers } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)

  const { count: questionsThisMonth } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .lte('publish_date', todayStr)
    .gte('publish_date', startOfMonth.slice(0, 10))
    .in('status', ['scheduled', 'published'])

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <section className="flex items-start gap-4">
        {/* Avatar */}
        {/* Display name, headline, handle */}
        {/* Link to public profile */}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4">
        {/* Monthly answers: X of Y budget used */}
        {/* Selectivity: X of Z questions answered */}
        {/* Total answers (all time) */}
      </section>

      {/* Edit Profile */}
      <section>
        <h2 className="text-lg font-semibold text-warm-800 mb-4">Edit Profile</h2>
        <EditProfileForm profile={profile} />
      </section>
    </div>
  )
}
```

The dashboard page:
- Is server-rendered (fetches fresh data on each visit)
- Passes the full profile object to the edit form
- Shows stats that reinforce the selectivity mechanic
- Links to the public profile for previewing what others see
</task>

<task id="4" title="Verify build and end-to-end flow" depends_on="3">
Run `npm run build` and verify:
1. All routes compile without errors
2. Dashboard page renders correctly
3. EditProfileForm component is included in the build

Test the full flow (requires local Supabase):
1. Sign in → navigate to Dashboard
2. Fill in headline, bio, organization
3. Change handle to something custom
4. Submit → verify success message
5. Visit `/expert/[new-handle]` → verify profile data displays
6. Visit an answer card → verify expert name links to `/expert/[handle]`
7. Try setting a handle that's already taken → verify friendly error
</task>

## Verification

- [ ] Expert can edit display_name from the dashboard (PROF-02)
- [ ] Expert can edit headline, bio, and organization from the dashboard (PROF-02)
- [ ] Expert can change handle with validation (lowercase, alphanumeric + hyphens, 3-40 chars)
- [ ] Duplicate handle returns "That handle is already taken" error
- [ ] Field length limits are enforced (headline 120, bio 500, org 100, name 2-80)
- [ ] Form shows loading state during save
- [ ] Success and error messages display correctly
- [ ] Dashboard shows profile preview with avatar, name, headline
- [ ] Dashboard shows monthly stats: budget usage, selectivity ratio, total answers
- [ ] Dashboard links to public profile page
- [ ] `npm run build` succeeds
