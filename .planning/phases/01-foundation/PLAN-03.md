---
phase: 1
plan: "03"
title: "Authentication flow — OAuth providers, login page, route protection"
wave: 2
depends_on: ["01", "02"]
requirements: ["AUTH-01", "AUTH-02", "AUTH-03", "AUTH-04", "AUTH-05"]
files_modified:
  - "src/app/login/page.jsx"
  - "src/app/auth/callback/route.js"
  - "src/app/auth/auth-code-error/page.jsx"
  - "src/app/dashboard/page.jsx"
  - "src/app/admin/layout.jsx"
  - "src/app/admin/page.jsx"
  - "src/lib/supabase/middleware.js"
autonomous: false
estimated_tasks: 7
---

# Plan 03: Authentication flow — OAuth providers, login page, route protection

## Objective

Wire up the complete authentication flow: configure Google OAuth and LinkedIn OIDC as Supabase Auth providers, build the login page with sign-in buttons, create the OAuth callback route, implement middleware-based route protection for `/dashboard` and `/admin` routes, add server-side admin role enforcement in the admin layout, and verify that profile auto-creation triggers correctly on first login. This plan depends on both Plan 01 (Next.js project with Supabase client factories) and Plan 02 (database schema with profiles table and `handle_new_user` trigger).

**Autonomous: false** — This plan requires manual configuration of OAuth credentials in the Google Cloud Console, LinkedIn Developer Portal, and Supabase Dashboard. The executor should pause and prompt for these manual steps.

## must_haves

- User can sign in with Google OAuth and arrive back at the app logged in
- User can sign in with LinkedIn OIDC (`linkedin_oidc` provider, NOT `linkedin`) and arrive back logged in
- After first login, a `profiles` row exists with `display_name` and `avatar_url` populated from OAuth metadata
- Session persists across browser refresh (cookie-based via `@supabase/ssr`)
- Unauthenticated user navigating to `/dashboard` is redirected to `/login`
- Unauthenticated user navigating to `/admin` is redirected to `/login`
- Authenticated non-admin user navigating to `/admin` is redirected to `/`
- Authenticated admin user can access `/admin` pages
- Admin enforcement happens at both middleware (fast reject) and layout (server-side check) layers

## Tasks

<task id="1" title="Configure OAuth providers in Supabase Dashboard">
**This task requires manual action in three external dashboards.**

**Google OAuth:**
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application type)
3. Add authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
4. For local development, also add: `http://127.0.0.1:54321/auth/v1/callback`
5. Copy Client ID and Client Secret
6. In Supabase Dashboard > Auth > Providers > Google: paste Client ID and Client Secret, enable the provider

**LinkedIn OIDC:**
1. Go to https://www.linkedin.com/developers/
2. Create a new app (requires a LinkedIn company page — can use a personal one for development)
3. Under Products, add: "Sign In with LinkedIn using OpenID Connect"
4. Under Auth settings, add redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
5. For local development, also add: `http://127.0.0.1:54321/auth/v1/callback`
6. Copy Client ID and Client Secret
7. In Supabase Dashboard > Auth > Providers > LinkedIn (OIDC): paste Client ID and Client Secret, enable the provider

**Critical:** The Supabase provider name is `linkedin_oidc`, NOT `linkedin`. The older provider is deprecated.

**Supabase Auth settings:**
- In Supabase Dashboard > Auth > Settings, enable "Automatically link accounts with the same email" to handle users who sign in with Google first and LinkedIn second (or vice versa). See 01-RESEARCH.md Section 4.7.
- Disable email/password auth (Ethos is social-login only)

**LinkedIn Development Mode note:** LinkedIn apps in Development mode only allow explicitly whitelisted test users (up to ~20). For beta, add each tester manually. Apply for Production mode when the app has a privacy policy page (Phase 5). See 01-RESEARCH.md Section 4.2.
</task>

<task id="2" title="Create OAuth callback route" depends_on="1">
Create `src/app/auth/callback/route.js` — the route that handles the OAuth redirect from Supabase Auth after the user authorizes with Google or LinkedIn.

See 01-RESEARCH.md Section 2.7 for the exact implementation:

```javascript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth error — redirect to error page
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

This route:
1. Receives the `code` parameter from Supabase Auth
2. Exchanges the code for a session (sets auth cookies)
3. Redirects to the `next` URL parameter (default: `/`)
4. On error, redirects to an error page
</task>

<task id="3" title="Create auth error page" depends_on="2">
Create `src/app/auth/auth-code-error/page.jsx` — a minimal error page shown when OAuth fails.

```jsx
import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold text-warm-900 mb-4">
        Authentication Error
      </h1>
      <p className="text-warm-600 mb-6">
        Something went wrong during sign in. Please try again.
      </p>
      <Link
        href="/login"
        className="text-warm-700 underline hover:text-warm-900"
      >
        Back to login
      </Link>
    </main>
  )
}
```
</task>

<task id="4" title="Build login page" depends_on="2">
Create `src/app/login/page.jsx` — the login page with Google and LinkedIn sign-in buttons.

See 01-RESEARCH.md Section 2.10 for the pattern. This is a Client Component (`'use client'`) because it needs `onClick` handlers and `window.location.origin`.

```jsx
'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function signInWithLinkedIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold text-warm-900 mb-2">Ethos</h1>
      <p className="text-warm-600 mb-8">Sign in to share your expertise</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={signInWithGoogle}
          className="w-full px-4 py-3 bg-white border border-warm-200 rounded-lg text-warm-800 font-medium hover:bg-warm-50 transition-colors"
        >
          Sign in with Google
        </button>
        <button
          onClick={signInWithLinkedIn}
          className="w-full px-4 py-3 bg-[#0A66C2] text-white rounded-lg font-medium hover:bg-[#004182] transition-colors"
        >
          Sign in with LinkedIn
        </button>
      </div>
    </main>
  )
}
```

Key details:
- Provider string for LinkedIn MUST be `'linkedin_oidc'` (not `'linkedin'`)
- `redirectTo` uses `window.location.origin` to work in both dev and production
- Minimal styling consistent with the warm palette
</task>

<task id="5" title="Verify and update middleware route protection" depends_on="4">
The middleware was scaffolded in Plan 01 Task 5 with the `updateSession` function from `src/lib/supabase/middleware.js`. Verify it includes protected route redirects.

Check `src/lib/supabase/middleware.js` contains the route protection logic from 01-RESEARCH.md Section 2.5:

1. **Session refresh:** Always calls `supabase.auth.getUser()` to refresh the session cookie
2. **Unauthenticated redirect:** If `!user` and path starts with `/admin` or `/dashboard`, redirect to `/login`
3. **Admin role check:** If `user` and path starts with `/admin`, query `profiles.role` — if not `'admin'`, redirect to `/`
4. **Pass-through:** For all other routes, return the response with refreshed cookies

The middleware client factory in `src/lib/supabase/middleware.js` must:
- Read cookies from `request.cookies.getAll()`
- Write cookies to both `request.cookies.set()` and `supabaseResponse.cookies.set()`
- Recreate `NextResponse.next({ request })` after setting cookies (this is required for the cookie changes to propagate)

If the middleware was already correctly implemented in Plan 01, this task is a verification pass. If any logic is missing (especially the admin role query), add it now.
</task>

<task id="6" title="Create admin layout with server-side role check" depends_on="5">
Create the admin layout with a second layer of role enforcement. See 01-RESEARCH.md Section 2.11.

**`src/app/admin/layout.jsx`:**
```jsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return <>{children}</>
}
```

**`src/app/admin/page.jsx`** — Placeholder admin page:
```jsx
export default function AdminPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-warm-900">Admin</h1>
      <p className="text-warm-600 mt-2">Admin panel — coming in Phase 4.</p>
    </main>
  )
}
```

**`src/app/dashboard/page.jsx`** — Placeholder dashboard page:
```jsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, handle, avatar_url, answer_limit')
    .eq('id', user.id)
    .single()

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-warm-900">Dashboard</h1>
      <p className="text-warm-600 mt-2">
        Welcome, {profile?.display_name ?? 'Expert'}
      </p>
      <p className="text-warm-500 mt-1 text-sm">
        Handle: @{profile?.handle} · Answer limit: {profile?.answer_limit}/month
      </p>
    </main>
  )
}
```

This dashboard page serves double duty: it verifies that (a) the auth redirect works, (b) the profiles table has data, and (c) the `handle_new_user` trigger populated the profile correctly.
</task>

<task id="7" title="End-to-end auth verification" depends_on="6">
Run through the complete auth flow to verify all requirements. This requires a running local Supabase instance (from Plan 02) and the Next.js dev server.

**Prerequisites:**
- `npx supabase start` is running (from Plan 02)
- `.env.local` has correct local Supabase URL and keys
- OAuth providers are configured in Supabase Dashboard (Task 1)
- `npm run dev` is running

**Test sequence (AUTH-01 through AUTH-05, PROF-01):**

1. **AUTH-02 — Google OAuth:** Visit `/login` > Click "Sign in with Google" > Complete Google consent > Verify redirect back to `/` > Verify you are logged in

2. **PROF-01 — Profile auto-creation:** Check the `profiles` table in Supabase Studio:
   - Row exists with `id` matching `auth.users.id`
   - `display_name` populated from Google metadata
   - `avatar_url` populated (paste URL in browser to verify it's a valid image)
   - `handle` auto-generated (e.g., `john-smith-a3f2`)
   - `role` = 'user'
   - `answer_limit` = 3

3. **AUTH-03 — Session persistence:** Close the browser tab > Reopen the app URL > Verify still logged in (no redirect to `/login`) > Check DevTools > Application > Cookies: Supabase auth cookies are present

4. **AUTH-04 — Protected route redirect:** Sign out > Navigate to `/dashboard` > Verify redirect to `/login` > Navigate to `/admin` > Verify redirect to `/login`

5. **AUTH-05 — Admin role enforcement:**
   - Sign in as a normal user > Navigate to `/admin` > Verify redirect to `/` (not admin)
   - In Supabase Studio, manually promote the user:
     ```sql
     UPDATE profiles SET role = 'admin' WHERE id = '<user-id>';
     ```
   - Sign out and sign back in (or hard refresh) > Navigate to `/admin` > Verify the admin placeholder page loads

6. **AUTH-01 — LinkedIn OIDC:** Sign out > Click "Sign in with LinkedIn" > Complete LinkedIn consent > Verify redirect back to `/` > Verify profile created in `profiles` table
   - If LinkedIn app is in Development mode, ensure your LinkedIn account is listed as a test user in the LinkedIn Developer Portal

7. **Cross-provider test (if same email on both):** Sign out > Sign in with the other provider using the same email > Verify account linking works (same `profiles` row, not a duplicate) — this depends on the "Automatically link accounts" setting from Task 1

**If any test fails:** Check the browser console for errors, check the Supabase Auth logs in Supabase Studio, and verify the OAuth redirect URIs match exactly.
</task>

## Verification

- [ ] Google OAuth sign-in completes successfully (AUTH-02)
- [ ] LinkedIn OIDC sign-in completes successfully using `linkedin_oidc` provider (AUTH-01)
- [ ] Profile row auto-created on first login with display_name, avatar_url, handle (PROF-01)
- [ ] Session persists across browser tab close and reopen (AUTH-03)
- [ ] Unauthenticated user redirected from `/dashboard` to `/login` (AUTH-04)
- [ ] Unauthenticated user redirected from `/admin` to `/login` (AUTH-04)
- [ ] Authenticated non-admin redirected from `/admin` to `/` (AUTH-05)
- [ ] Authenticated admin can access `/admin` page (AUTH-05)
- [ ] Admin enforcement happens at both middleware and admin layout layers (AUTH-05)
- [ ] Dashboard page shows profile data (display_name, handle, answer_limit) (PROF-01)
- [ ] Auth callback route at `/auth/callback` exchanges code for session correctly
- [ ] Auth error page renders at `/auth/auth-code-error`
