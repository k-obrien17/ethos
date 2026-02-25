---
phase: 6
plan: "01"
title: "Welcome flow and first-answer nudge"
wave: 1
depends_on: []
requirements: ["ONBR-01", "ONBR-02"]
files_modified:
  - "src/app/auth/callback/route.js"
  - "src/app/welcome/page.jsx"
  - "src/components/EditProfileForm.jsx"
  - "src/app/dashboard/page.jsx"
  - "src/app/page.jsx"
autonomous: true
estimated_tasks: 4
---

# Plan 01: Welcome flow and first-answer nudge

## Objective

Guide new users through profile completion after their first sign-in, and nudge users who haven't answered any questions yet. No migration needed — detection uses existing `headline IS NULL` check on the profiles table.

## must_haves

- Auth callback detects incomplete profile (headline IS NULL) and redirects to /welcome (ONBR-01)
- Welcome page prompts user to set handle, headline, and bio (ONBR-01)
- Welcome page reuses EditProfileForm or a subset of it (ONBR-01)
- After completing profile, user is redirected to homepage (ONBR-01)
- Dashboard shows first-answer nudge when user has 0 total answers (ONBR-02)
- Homepage shows first-answer nudge for authenticated users with 0 answers (ONBR-02)

## Tasks

<task id="1" title="Update auth callback to detect new users">
Modify `src/app/auth/callback/route.js`:

After exchanging the code for a session, query the user's profile. If `headline` is null (profile incomplete), redirect to `/welcome` instead of the default `/`.

```javascript
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if profile is complete (new users have null headline)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('headline')
          .eq('id', user.id)
          .single()

        if (!profile?.headline) {
          return NextResponse.redirect(`${origin}/welcome`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

This means returning users who haven't set their headline will see /welcome again — that's intentional nudging. Once they complete their profile, subsequent logins go straight to `/`.
</task>

<task id="2" title="Create welcome page">
Create `src/app/welcome/page.jsx` — a Server Component page that renders the EditProfileForm with a welcoming intro. Requires auth (redirect to /login if not signed in).

```jsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditProfileForm from '@/components/EditProfileForm'

export const metadata = {
  title: 'Welcome',
}

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile is already complete, redirect to homepage
  if (profile?.headline) redirect('/')

  return (
    <div className="space-y-6">
      <section className="text-center py-4">
        <h1 className="text-2xl font-bold text-warm-900">
          Welcome to Ethos
        </h1>
        <p className="text-warm-600 mt-2 max-w-md mx-auto">
          Complete your profile so other experts know who you are.
          You can always update this later from your dashboard.
        </p>
      </section>

      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <EditProfileForm profile={profile} redirectTo="/" />
      </section>
    </div>
  )
}
```

**Important:** The `EditProfileForm` component needs a minor update to accept an optional `redirectTo` prop. When provided, after successful save, use `router.push(redirectTo)` instead of just showing the success message. This way, completing the welcome form redirects to the homepage.

Update `src/components/EditProfileForm.jsx` to accept `redirectTo` prop:
- Add `redirectTo` to the component props
- After `state?.success`, if `redirectTo` is set, call `router.push(redirectTo)` via `useRouter`
- If no `redirectTo`, keep existing success message behavior

```jsx
// In EditProfileForm.jsx:
import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export default function EditProfileForm({ profile, redirectTo }) {
  const router = useRouter()
  const redirected = useRef(false)

  // After successful save, redirect if requested (guard prevents double-nav on re-render)
  useEffect(() => {
    if (state?.success && redirectTo && !redirected.current) {
      redirected.current = true
      router.push(redirectTo)
    }
  }, [state?.success, redirectTo, router])

  // ... rest of component
}
```
</task>

<task id="3" title="Add first-answer nudge to dashboard">
Update `src/app/dashboard/page.jsx`:

After the stats section, if `totalAnswers === 0`, show a nudge card:

```jsx
{totalAnswers === 0 && todayQuestion && (
  <section className="bg-warm-100 rounded-lg p-6 text-center">
    <p className="text-warm-800 font-medium">
      Ready to share your first answer?
    </p>
    <p className="text-warm-600 text-sm mt-1">
      Today's question is waiting. Your answer budget resets monthly — use it or lose it.
    </p>
    <Link
      href={`/q/${todayQuestion.slug}`}
      className="inline-block mt-3 px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
    >
      Answer today's question
    </Link>
  </section>
)}
```

This requires fetching today's question on the dashboard. Add a query:

```javascript
// Fetch today's question (for nudge)
const { data: todayQuestion } = await supabase
  .from('questions')
  .select('slug, body')
  .lte('publish_date', todayStr)
  .in('status', ['scheduled', 'published'])
  .order('publish_date', { ascending: false })
  .limit(1)
  .single()
```

Place the nudge between the stats section and the "Edit Profile" section.
</task>

<task id="4" title="Add first-answer nudge to homepage">
Update `src/app/page.jsx`:

After the today's question section, if the user is authenticated and has 0 answers, show a subtle nudge. Since this is a Server Component, check auth and answer count:

```jsx
// Check if user is authenticated and has answered
const { data: { user } } = await supabase.auth.getUser()
let showNudge = false
if (user) {
  const { count: userAnswerCount } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)
  showNudge = (userAnswerCount ?? 0) === 0
}
```

Then, inside the today's question section, if `showNudge` is true and there IS a question, add a small prompt:

```jsx
{showNudge && todayQuestion && (
  <div className="mt-4 p-3 bg-warm-100 rounded-lg text-center">
    <p className="text-warm-700 text-sm">
      This is your first day on Ethos.{' '}
      <Link href={`/q/${todayQuestion.slug}`} className="font-medium underline hover:text-warm-900">
        Answer today's question
      </Link>
      {' '}to get started.
    </p>
  </div>
)}
```

Place this right after the "X experts have answered" count, before the answers list.
</task>

## Verification

- [ ] New user signing in for the first time is redirected to /welcome
- [ ] Welcome page shows profile form with handle, headline, bio fields
- [ ] After completing profile, user is redirected to homepage
- [ ] Returning user with completed profile goes straight to / after login
- [ ] Dashboard shows "Answer your first question" nudge when totalAnswers is 0
- [ ] Homepage shows nudge for authenticated users with 0 answers
- [ ] Nudge links to today's question page
- [ ] Nudge does not appear for users who have answered at least once
- [ ] `npm run build` succeeds
