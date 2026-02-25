---
phase: 5
plan: "02"
title: "Account deletion, privacy/terms pages, and footer"
wave: 2
depends_on: ["01"]
requirements: ["INFR-04", "INFR-05"]
files_modified:
  - "supabase/migrations/00006_created_by_set_null.sql"
  - "src/app/actions/profile.js"
  - "src/lib/supabase/admin.js"
  - "src/components/DeleteAccountSection.jsx"
  - "src/app/dashboard/page.jsx"
  - "src/app/privacy/page.jsx"
  - "src/app/terms/page.jsx"
  - "src/components/Footer.jsx"
  - "src/app/layout.jsx"
autonomous: true
estimated_tasks: 7
---

# Plan 02: Account deletion, privacy/terms pages, and footer

## Objective

Complete the launch-readiness features: let users delete their account and all data, add legal pages (privacy policy and terms of service), and add a site footer with links. This depends on Plan 01 (which modifies dashboard/page.jsx for responsive grids and layout.jsx for metadata).

## must_haves

- User can delete their account from the dashboard with confirmation (INFR-04)
- Account deletion removes all user data: auth record, profile, and answers via cascade (INFR-04)
- Deletion uses Supabase admin API (service role key) to delete the auth.users row (INFR-04)
- User is signed out and redirected after deletion (INFR-04)
- Privacy policy page at `/privacy` (INFR-05)
- Terms of Service page at `/terms` (INFR-05)
- Footer with links to privacy and terms visible on all pages (INFR-05)
- `questions.created_by` FK updated to ON DELETE SET NULL so admin account deletion doesn't fail (INFR-04)

## Tasks

<task id="1" title="Fix questions.created_by FK for cascade safety">
Create `supabase/migrations/00006_created_by_set_null.sql`:

```sql
-- Fix: questions.created_by FK defaults to NO ACTION, which blocks
-- deletion of admin profiles that have created questions.
-- Change to ON DELETE SET NULL so account deletion cascades properly.
ALTER TABLE public.questions
  DROP CONSTRAINT questions_created_by_fkey,
  ADD CONSTRAINT questions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    ON DELETE SET NULL;
```

This ensures that when an admin deletes their account, their authored questions remain (with `created_by` set to NULL) instead of blocking the cascade.
</task>

<task id="2" title="Create Supabase admin client helper">
Create `src/lib/supabase/admin.js` — a server-only Supabase client using the service role key for admin operations (account deletion).

```javascript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

This bypasses RLS entirely — use only for admin operations where the user's own auth token is insufficient (like deleting their auth record). The `SUPABASE_SERVICE_ROLE_KEY` is already in `.env.example`.
</task>

<task id="3" title="Add deleteAccount Server Action">
Add `deleteAccount` function to `src/app/actions/profile.js`:

```javascript
import { createAdminClient } from '@/lib/supabase/admin'

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
  // This triggers ON DELETE CASCADE: auth.users → profiles → answers
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) return { error: 'Failed to delete account. Please try again.' }

  // Revalidate pages that showed this user's data
  revalidatePath('/')
  revalidatePath('/questions')
  if (profile?.handle) revalidatePath(`/expert/${profile.handle}`)

  return { success: true }
}
```

Key details:
- Authenticates with the user's own token first (verifies they're signed in)
- Uses the admin client (service role) to delete the auth.users row
- Cascading deletes handle everything: profiles → answers
- Returns `{ success: true }` — the client handles sign-out and redirect
</task>

<task id="4" title="Create DeleteAccountSection client component">
Create `src/components/DeleteAccountSection.jsx` — a Client Component with confirmation dialog.

```jsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/app/actions/profile'

export default function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    setPending(true)
    const result = await deleteAccount()
    if (result?.error) {
      alert(result.error)
      setPending(false)
      setConfirming(false)
    } else {
      await supabase.auth.signOut()
      router.push('/')
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-500 hover:text-red-700"
      >
        Delete my account
      </button>
    )
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <p className="text-sm text-red-800 font-medium">
        Are you sure? This will permanently delete your profile and all your answers.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleDelete}
          disabled={pending}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? 'Deleting...' : 'Yes, delete my account'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="px-3 py-1.5 text-sm text-warm-600 hover:text-warm-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

Two-step confirmation: first shows "Delete my account" link, then expands to warning + confirm/cancel buttons. After deletion, signs out and redirects to homepage.
</task>

<task id="5" title="Add delete account section to dashboard">
Add the `DeleteAccountSection` component to `src/app/dashboard/page.jsx` at the bottom, below the edit form:

```jsx
import DeleteAccountSection from '@/components/DeleteAccountSection'

// ... existing dashboard content ...

{/* Danger zone */}
<section className="pt-4 border-t border-warm-200">
  <DeleteAccountSection />
</section>
```

Separated from the edit form by a border. Minimal styling — just the delete button/confirmation.
</task>

<task id="6" title="Create privacy and terms pages">
Create two static pages:

**`src/app/privacy/page.jsx`:**
```jsx
export const metadata = {
  title: 'Privacy Policy',
  description: 'Ethos privacy policy.',
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-warm max-w-none">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: February 2026</em></p>

      <h2>What we collect</h2>
      <p>When you sign in via Google or LinkedIn, we store your name, email, and profile photo...</p>

      <h2>How we use it</h2>
      <p>Your profile and answers are displayed publicly on Ethos...</p>

      <h2>Data retention</h2>
      <p>Your data is retained as long as your account is active. You can delete your account at any time from your dashboard...</p>

      <h2>Third parties</h2>
      <p>We use Supabase (database/auth), Vercel (hosting), Google and LinkedIn (authentication)...</p>

      <h2>Contact</h2>
      <p>Questions? Email privacy@ethos.example.com</p>
    </article>
  )
}
```

**`src/app/terms/page.jsx`:**
```jsx
export const metadata = {
  title: 'Terms of Service',
  description: 'Ethos terms of service.',
}

export default function TermsPage() {
  return (
    <article className="prose prose-warm max-w-none">
      <h1>Terms of Service</h1>
      <p><em>Last updated: February 2026</em></p>

      <h2>The service</h2>
      <p>Ethos is a platform where experts answer curated questions...</p>

      <h2>Your content</h2>
      <p>You retain ownership of your answers. By posting, you grant Ethos a license to display them publicly...</p>

      <h2>Conduct</h2>
      <p>Answers must be authentic and your own. Automated, AI-generated, or spam answers may be removed...</p>

      <h2>Account termination</h2>
      <p>You may delete your account at any time. We may remove content or accounts that violate these terms...</p>

      <h2>Disclaimers</h2>
      <p>Ethos is provided as-is. We make no guarantees about uptime or data availability during beta...</p>
    </article>
  )
}
```

Both use Tailwind `prose` for readable long-form text. Content is appropriate for beta — not full legal copy, but covers the essential bases.

Note: Need to install `@tailwindcss/typography` for `prose` classes, OR use manual typography styles. If the project doesn't have the typography plugin, use inline Tailwind classes instead (e.g., `[&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-warm-700 [&_p]:mb-4` etc.).
</task>

<task id="7" title="Create Footer component and add to layout">
Create `src/components/Footer.jsx`:

```jsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 py-6 border-t border-warm-200">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between text-xs text-warm-400">
        <span>© {new Date().getFullYear()} Ethos</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-warm-600">Privacy</Link>
          <Link href="/terms" className="hover:text-warm-600">Terms</Link>
        </div>
      </div>
    </footer>
  )
}
```

Add Footer to `src/app/layout.jsx` after the `<main>` block:
```jsx
import Footer from '@/components/Footer'

// In the body:
<main className="...">
  {children}
</main>
<Footer />
```

The footer sits outside the max-w-2xl main container but has its own matching `max-w-2xl mx-auto px-4` for alignment.
</task>

## Verification

- [ ] User can delete their account from the dashboard (INFR-04)
- [ ] After deletion, user is signed out and redirected to homepage (INFR-04)
- [ ] Deleted user's profile and answers no longer appear in public feeds (INFR-04)
- [ ] Cascade works: deleting auth.users removes profiles and answers (INFR-04)
- [ ] Admin who created questions can still delete their account (created_by set to NULL) (INFR-04)
- [ ] Privacy policy page accessible at `/privacy` (INFR-05)
- [ ] Terms of Service page accessible at `/terms` (INFR-05)
- [ ] Footer with privacy and terms links visible on all pages (INFR-05)
- [ ] `npm run build` succeeds
