# Phase 1: Foundation — Research

**Phase goal:** Establish project scaffolding, database schema, authentication, and deployment pipeline so every subsequent phase builds on a working, deployed app.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, INFR-01, INFR-02

---

## 1. Implementation Approach

### Strategy: Replace, Don't Evolve

The existing codebase is the old Daily 10 Tauri app (Vite + React + Tauri, local-only). Phase 1 creates a fresh Next.js project from scratch. The old `src/`, `src-tauri/`, and `package.json` will be replaced entirely. Nothing from the current codebase carries forward.

### Work Streams

Phase 1 has three natural work streams that must execute in order, with some parallelism in the middle:

**Stream A: Project Scaffolding (deliverables 1, 2, 13)**
- Initialize Next.js 15 project with App Router
- Configure Tailwind CSS v4, Inter font, warm color palette
- Deploy to Vercel immediately (deploy-first development)
- Set up environment variables

**Stream B: Database & Schema (deliverables 3, 4, 5, 6, 7, 14)**
- Initialize Supabase CLI and local development environment
- Create migration files for profiles, questions, answers tables
- Write RLS policies (default deny, explicit grants)
- Create `handle_new_user` trigger for profile auto-creation
- Add unique indexes and constraints
- Check migrations into `supabase/migrations/`

**Stream C: Authentication (deliverables 8, 9, 10, 11, 12)**
- Configure Supabase Auth providers (Google OAuth, LinkedIn OIDC)
- Set up `@supabase/ssr` with three client factories
- Build middleware for session refresh and protected route redirects
- Implement admin role enforcement (middleware + layout)
- Wire up profile auto-creation on first login

### Build Order Within Phase

```
1. Project init + Vercel deploy (Stream A)        — ~30 min
2. Supabase project + CLI setup (Stream B start)  — ~30 min
3. Database schema migration (Stream B)           — ~1 hr
4. RLS policies + triggers (Stream B)             — ~1 hr
5. Supabase client factories (Stream C start)     — ~30 min
6. Auth callback route (Stream C)                 — ~30 min
7. Google OAuth flow (Stream C)                   — ~30 min
8. LinkedIn OIDC flow (Stream C)                  — ~30 min
9. Middleware: session refresh + route protection  — ~1 hr
10. Admin role enforcement (middleware + layout)   — ~30 min
11. Login/logout pages                            — ~1 hr
12. End-to-end verification                       — ~1 hr
```

Steps 1-2 can happen in parallel. Steps 3-4 depend on 2. Steps 5-8 depend on 2-3. Steps 9-11 depend on 5-8. Step 12 depends on everything.

---

## 2. Technical Details

### 2.1 Project Initialization

**Create the Next.js project (replacing the existing codebase):**

```bash
# From parent directory — will scaffold into a new temp dir, then move files
npx create-next-app@latest ethos-next --app --tailwind --eslint --src-dir --import-alias "@/*"
```

Alternatively, scaffold in-place after clearing the old files. The key flags:
- `--app` — App Router (not Pages Router)
- `--tailwind` — Tailwind CSS v4 (installed by default with recent create-next-app)
- `--eslint` — ESLint with next config
- `--src-dir` — Source files in `src/` (convention from existing project)
- `--import-alias "@/*"` — Clean imports

**Decision: JavaScript, not TypeScript.** Per CLAUDE.md: "No TypeScript — keep it JS/JSX". The `create-next-app` prompt will ask — select JavaScript.

### 2.2 Tailwind CSS v4 Configuration

Tailwind v4 uses CSS-first configuration. No `tailwind.config.js`.

**`postcss.config.mjs`:**
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

**`src/app/globals.css`:**
```css
@import "tailwindcss";

@theme {
  --color-warm-50: #faf5f0;
  --color-warm-100: #f0e6d8;
  --color-warm-200: #e3d0bb;
  --color-warm-300: #d4b896;
  --color-warm-400: #c49d6f;
  --color-warm-500: #b48352;
  --color-warm-600: #9a6b3f;
  --color-warm-700: #7d5432;
  --color-warm-800: #5e3e26;
  --color-warm-900: #2d1f0e;

  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
```

**Note:** The exact warm palette hex values need to be finalized. The above are approximations carried from the existing Daily 10 CSS. Adjust during implementation.

### 2.3 Root Layout

**`src/app/layout.jsx`:**
```jsx
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Ethos',
  description: 'What you choose to answer reveals what you stand for.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-warm-50 text-warm-900 antialiased">
        {children}
      </body>
    </html>
  )
}
```

Use `next/font/google` for Inter — not `@fontsource/inter`. Next.js self-hosts the font automatically (no layout shift, no external requests).

### 2.4 Environment Variables

**`.env.local` (never committed):**
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- `NEXT_PUBLIC_` prefix: exposed to browser (needed for client-side Supabase client)
- `SUPABASE_SERVICE_ROLE_KEY`: server-only, bypasses RLS (for admin ops, triggers)
- Vercel dashboard will hold production values

**`.env.example` (committed, no secrets):**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 2.5 Supabase Client Factories

Three separate client creators, per the `@supabase/ssr` pattern:

**`src/lib/supabase/client.js` — Browser Client Component usage:**
```javascript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

**`src/lib/supabase/server.js` — Server Component / Server Action usage:**
```javascript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — cookie setting ignored
          }
        },
      },
    }
  )
}
```

**`src/lib/supabase/middleware.js` — Middleware session refresh:**
```javascript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected route redirects
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')

  if (!user && (isAdminRoute || isDashboardRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Admin role enforcement (fast reject in middleware)
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
```

**Important middleware note:** The admin role check in middleware queries Supabase on every `/admin/*` request. This is acceptable for Phase 1 with 2-5 admin users. If it becomes a performance concern later, cache the role in the JWT custom claims or a short-lived cookie.

### 2.6 Middleware Entry Point

**`src/middleware.js`:**
```javascript
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 2.7 Auth Callback Route

**`src/app/auth/callback/route.js`:**
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

### 2.8 Database Schema (Migration SQL)

This is the core migration. Create as `supabase/migrations/00001_initial_schema.sql`:

```sql
-- ============================================================
-- Profiles table (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  answer_limit INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Questions table (curated by editorial team)
-- ============================================================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  publish_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Answers table (the core content)
-- ============================================================
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Unique constraints
-- ============================================================
-- One answer per expert per question
CREATE UNIQUE INDEX idx_answers_expert_question ON public.answers (expert_id, question_id);

-- Profile handle uniqueness (already UNIQUE on column, index for lookups)
CREATE INDEX idx_profiles_handle ON public.profiles (handle);

-- Question slug uniqueness (already UNIQUE on column, index for lookups)
CREATE INDEX idx_questions_slug ON public.questions (slug);

-- ============================================================
-- Performance indexes
-- ============================================================
-- Question feed: published questions ordered by date
CREATE INDEX idx_questions_publish_date ON public.questions (publish_date DESC)
  WHERE publish_date IS NOT NULL;

-- Answers by question (question page feed)
CREATE INDEX idx_answers_question ON public.answers (question_id, created_at DESC);

-- Answers by expert (expert profile feed)
CREATE INDEX idx_answers_expert ON public.answers (expert_id, created_at DESC);

-- Monthly answer limit check
CREATE INDEX idx_answers_expert_month ON public.answers (expert_id, created_at);

-- ============================================================
-- Auto-create profile on signup trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_handle TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract display name from OAuth metadata
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract avatar from OAuth metadata
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- Generate handle from name (lowercase, hyphens, no special chars)
  v_handle := lower(regexp_replace(
    regexp_replace(v_display_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));

  -- Append random suffix to ensure uniqueness
  v_handle := v_handle || '-' || substr(gen_random_uuid()::text, 1, 4);

  INSERT INTO public.profiles (id, handle, display_name, avatar_url)
  VALUES (NEW.id, v_handle, v_display_name, v_avatar_url);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER answers_updated_at
  BEFORE UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 2.9 RLS Policies (Separate Migration)

Create as `supabase/migrations/00002_rls_policies.sql`:

```sql
-- ============================================================
-- Enable RLS on all tables (default deny)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Profiles policies
-- ============================================================

-- Anyone can read profiles (public expert pages)
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No direct INSERT from client (trigger handles creation)
-- No DELETE from client (future: account deletion via server action)

-- ============================================================
-- Questions policies
-- ============================================================

-- Public readers see published questions (past and today)
CREATE POLICY "Published questions are publicly readable"
  ON public.questions FOR SELECT
  USING (
    publish_date IS NOT NULL
    AND publish_date <= CURRENT_DATE
    AND status IN ('scheduled', 'published')
  );

-- Admins see all questions (drafts, scheduled, published)
CREATE POLICY "Admins can read all questions"
  ON public.questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert questions
CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update questions
CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete questions
CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- Answers policies
-- ============================================================

-- Anyone can read answers (public feed)
CREATE POLICY "Answers are publicly readable"
  ON public.answers FOR SELECT
  USING (true);

-- Authenticated users can insert their own answers
CREATE POLICY "Users can insert own answers"
  ON public.answers FOR INSERT
  WITH CHECK (auth.uid() = expert_id);

-- Users can update their own answers
CREATE POLICY "Users can update own answers"
  ON public.answers FOR UPDATE
  USING (auth.uid() = expert_id)
  WITH CHECK (auth.uid() = expert_id);

-- Admins can delete any answer (moderation)
CREATE POLICY "Admins can delete answers"
  ON public.answers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**Schema notes:**
- The `role` column uses `'user'` (not `'expert'`) as the default. ARCHITECTURE.md uses `'expert'` in some places — normalize to `'user'` for Phase 1 since all authenticated users can answer. The role distinction that matters is `user` vs. `admin`.
- `answer_limit` defaults to 3 (free tier). Phase 2 adds the budget enforcement logic.
- The `handle_new_user` trigger generates a handle with a random suffix to avoid collisions. Users can edit their handle later (Phase 3, PROF-02).
- `SECURITY DEFINER` on `handle_new_user` is required because the trigger fires in the context of Supabase Auth, which doesn't have permission to write to the `profiles` table under RLS.
- `SET search_path = ''` on the trigger function is a Supabase security best practice — prevents search path manipulation.

### 2.10 OAuth Provider Configuration

**Google OAuth setup:**
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret
5. In Supabase Dashboard > Auth > Providers > Google: paste credentials

**LinkedIn OIDC setup:**
1. Go to https://www.linkedin.com/developers/
2. Create app (requires a LinkedIn company page)
3. Add product: "Sign In with LinkedIn using OpenID Connect"
4. Add authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret
6. In Supabase Dashboard > Auth > Providers > LinkedIn (OIDC): paste credentials

**Critical:** The Supabase provider is `linkedin_oidc`, NOT `linkedin`. The older provider is deprecated.

**Login page implementation:**
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
    <div>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
      <button onClick={signInWithLinkedIn}>Sign in with LinkedIn</button>
    </div>
  )
}
```

### 2.11 Admin Layout Server-Side Check

The middleware provides fast rejection. The admin layout provides a second check with proper data loading:

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

### 2.12 Vercel Deployment

1. Connect GitHub repo to Vercel (Vercel dashboard > Import Project)
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` = production Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = production anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = production service role key
3. Automatic deploys on push to `main`
4. Preview deploys on PR branches (automatic)

### 2.13 File Structure After Phase 1

```
src/
  app/
    layout.jsx                  — Root layout (Inter font, globals, body)
    page.jsx                    — Placeholder homepage
    globals.css                 — Tailwind v4 + warm palette
    login/
      page.jsx                  — Login page (Google + LinkedIn buttons)
    auth/
      callback/
        route.js                — OAuth callback handler
      auth-code-error/
        page.jsx                — Auth error fallback page
    dashboard/
      page.jsx                  — Placeholder (protected route)
    admin/
      layout.jsx                — Admin layout with server-side role check
      page.jsx                  — Placeholder (protected + admin-only)
  lib/
    supabase/
      client.js                 — Browser client factory
      server.js                 — Server client factory
      middleware.js              — Middleware client with session refresh
  middleware.js                  — Route protection + session refresh
supabase/
  config.toml                   — Supabase local dev config
  migrations/
    00001_initial_schema.sql    — Tables, indexes, triggers
    00002_rls_policies.sql      — RLS policies
  seed.sql                      — Optional: seed admin user
.env.local                      — Local dev env vars (not committed)
.env.example                    — Template for env vars (committed)
```

---

## 3. Dependencies and Order

### Hard Dependencies (must come first)

| Step | Depends On | Rationale |
|------|-----------|-----------|
| Supabase client factories | Next.js project exists | Need the project structure to place files |
| Auth callback route | Supabase client factories | Callback uses server client |
| OAuth flows | Supabase project + provider config | Providers must be configured in Supabase dashboard |
| Middleware route protection | Supabase client factories | Middleware uses its own client |
| Admin role enforcement | Database schema (profiles table with role column) | Role check queries profiles |
| Profile auto-creation trigger | Database schema (profiles table) | Trigger writes to profiles |
| RLS policies | Database schema (all tables must exist) | Policies reference table columns |
| Vercel deploy | Next.js project initialized | Need something to deploy |
| End-to-end auth test | All of the above | Full flow touches every component |

### Can Parallelize

- **Vercel deploy** can happen immediately after project init (deploy the placeholder)
- **Database schema** and **Supabase client factories** can be built in parallel (schema in Supabase, client code in Next.js)
- **Google OAuth** and **LinkedIn OIDC** configuration can happen in parallel
- **Login page UI** and **middleware** can be built in parallel (both depend on client factories)

### External Dependencies (not code)

| Dependency | Action Required | Timeline |
|-----------|----------------|----------|
| Supabase project | Create in Supabase dashboard | 5 minutes |
| Google OAuth credentials | Create in Google Cloud Console | 15 minutes |
| LinkedIn Developer app | Create at linkedin.com/developers | 15 minutes |
| LinkedIn OIDC product | Apply (usually auto-approved) | Minutes to days |
| Vercel project | Connect repo in Vercel dashboard | 5 minutes |
| Domain (optional for Phase 1) | Can use Vercel's `*.vercel.app` subdomain for beta | N/A |

**Critical path item:** LinkedIn OIDC approval. Apply for this on day 1 of Phase 1. If delayed, Google OAuth provides a working fallback for development and early testing.

---

## 4. Gotchas

### 4.1 LinkedIn Provider String

The Supabase provider must be `'linkedin_oidc'`, not `'linkedin'`. The older provider is deprecated and will not work. This is an easy typo that produces a confusing error.

### 4.2 LinkedIn Development Mode Limitation

LinkedIn apps in Development mode only allow users you explicitly whitelist (up to ~20 test users). For a 20-50 user beta, this is tight. Options:
- Add each beta tester manually as a test user
- Apply for Production mode early (requires company LinkedIn page + privacy policy URL + review)
- Lean on Google OAuth as primary, LinkedIn as secondary

**Recommendation:** Start in Development mode. Apply for Production as soon as Phase 1 is stable and a privacy policy page exists.

### 4.3 Supabase `@supabase/ssr` Cookie Patterns

The cookie handling in `server.js` and `middleware.js` must follow the exact pattern from Supabase docs. Common mistakes:
- Forgetting the `try/catch` in `server.js` `setAll` (Server Components can't set cookies)
- Not passing `request` through in middleware `NextResponse.next({ request })`
- Not copying cookies to both the request and the response in middleware

The code in Section 2.5 follows the current recommended pattern. Verify against the latest `@supabase/ssr` docs before implementation, as this pattern has changed between versions.

### 4.4 RLS Default Deny

Enabling RLS on a table with no policies means zero access — not even reads. This is the desired behavior (default deny), but it means:
- The `handle_new_user` trigger must use `SECURITY DEFINER` to bypass RLS when inserting the profile
- Service role key operations bypass RLS (never expose to client)
- If you forget a SELECT policy, the table appears empty from the client

**Test immediately after creating each table:** Query it from the Supabase JS client. If you get empty results when data exists, you have a missing RLS policy.

### 4.5 Handle Uniqueness in Trigger

The `handle_new_user` trigger generates a handle from the user's name. Two users named "John Smith" would collide without a uniqueness mechanism. The trigger appends a random 4-character suffix (e.g., `john-smith-a3f2`). This is ugly but safe for auto-generation. Users edit their handle later.

**Alternative approaches considered:**
- Sequential suffix (`john-smith-1`, `john-smith-2`) — requires a query in the trigger, adds complexity
- UUID as handle — not human-readable
- Random suffix — simple, unique enough, acceptable for auto-generated values

### 4.6 Supabase Free Tier Auto-Pause

Supabase pauses free-tier projects after 7 days of inactivity. During Phase 1 development this is unlikely (you're actively developing), but:
- After deploying to Vercel, even a few days without visitors could trigger a pause
- Set up a simple health check (UptimeRobot free tier, or a Vercel cron hitting the Supabase endpoint)
- Or upgrade to Supabase Pro ($25/month) before beta users arrive

### 4.7 Multi-Provider Email Collision

If a user signs in with Google (john@gmail.com) then later tries LinkedIn (same email), Supabase may create duplicate accounts. Configure Supabase Auth settings:
- Enable "Automatically link accounts" by email in Supabase Dashboard > Auth > Settings
- Test the cross-provider login flow explicitly during Phase 1

### 4.8 Middleware Runs on Every Request

The middleware matcher excludes static assets, but it still runs on every page navigation. The admin role check in middleware makes a Supabase query for `/admin/*` routes. For Phase 1 scale this is fine, but monitor latency. If it becomes an issue:
- Cache the admin role in a short-lived cookie after first check
- Or move the admin check entirely to the layout (server-side) and remove it from middleware

### 4.9 `create-next-app` May Overwrite Files

Running `create-next-app` in the existing directory will conflict with existing files (package.json, src/, etc.). Two approaches:
- **Clean approach:** Create in a temp directory, then move files into the repo (preserving git history)
- **In-place approach:** Delete old files first (`src/`, `src-tauri/`, `package.json`, `vite.config.js`, etc.), then run `create-next-app .` in the repo root

**Recommendation:** The clean approach. Create the Next.js project in a temp directory, then selectively move the scaffolded files into the repo. This preserves git history and lets you review what changed.

### 4.10 `search_path` Security on Trigger Functions

Supabase recommends `SET search_path = ''` on `SECURITY DEFINER` functions to prevent search path manipulation attacks. When using this, all table references must be fully qualified (`public.profiles`, not just `profiles`). The trigger SQL in Section 2.8 follows this pattern.

---

## 5. Verification Strategy

### Deliverable 1: Next.js project with App Router, Tailwind, Supabase config

**Verify:**
- `npm run dev` starts without errors on localhost:3000
- Tailwind classes render correctly (add a test class to the homepage)
- Supabase client factory files exist at `src/lib/supabase/{client,server,middleware}.js`
- `@supabase/supabase-js` and `@supabase/ssr` are in `package.json`

### Deliverable 2: Root layout with fonts, styles, palette

**Verify:**
- Homepage renders with Inter font (inspect in browser DevTools > Computed > font-family)
- Warm palette classes work: `bg-warm-50`, `text-warm-900`, etc.
- No layout shift on page load (font is preloaded by `next/font`)

### Deliverable 3: Supabase project with three tables

**Verify:**
```bash
npx supabase db reset  # Run migrations fresh
```
Then in Supabase Studio (localhost:54323):
- `profiles`, `questions`, `answers` tables exist
- Column types and constraints match the migration SQL
- `answer_limit` column exists on `profiles` with default 3

### Deliverable 4: RLS policies on all tables

**Verify:**
```sql
-- In Supabase SQL editor, confirm RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('profiles', 'questions', 'answers');
-- All should show rowsecurity = true
```

Then test with the JS client (anon key):
- Can SELECT from profiles (public read)
- Cannot INSERT into profiles (trigger-only)
- Cannot INSERT into questions (admin-only)
- Can SELECT published questions (after seeding one)

### Deliverable 5: Profile auto-created on signup

**Verify:**
1. Sign up a test user via Google OAuth
2. Check `profiles` table — a row should exist with:
   - `id` matching `auth.users.id`
   - `display_name` populated from OAuth metadata
   - `avatar_url` populated from OAuth metadata
   - `handle` auto-generated
   - `role` = 'user'
   - `answer_limit` = 3

### Deliverable 6: answer_limit column

**Verify:**
- Column exists with correct type (INTEGER) and default (3)
- Already verified in Deliverable 3/5

### Deliverable 7: Unique indexes

**Verify:**
```sql
-- Confirm unique indexes exist
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('profiles', 'questions', 'answers')
AND indexdef LIKE '%UNIQUE%';
```
Expected: `idx_answers_expert_question`, plus the UNIQUE constraints on `profiles(handle)` and `questions(slug)`.

### Deliverable 8: Auth flow (LinkedIn + Google)

**Verify:**
- Click "Sign in with Google" → redirected to Google consent → callback → logged in
- Click "Sign in with LinkedIn" → redirected to LinkedIn consent → callback → logged in
- Both providers create entries in `auth.users` and `profiles`

**For LinkedIn specifically:** If still in Development mode, verify the test user is whitelisted.

### Deliverable 9: Cookie-based session persistence

**Verify:**
1. Sign in
2. Close the browser tab completely
3. Reopen the app URL
4. User is still logged in (no redirect to login page)
5. Check browser DevTools > Application > Cookies: Supabase auth cookies are present

### Deliverable 10: Middleware protected route redirects

**Verify:**
1. Sign out
2. Navigate to `/dashboard` → redirected to `/login`
3. Navigate to `/admin` → redirected to `/login`
4. Sign in as a non-admin user
5. Navigate to `/dashboard` → page loads
6. Navigate to `/admin` → redirected to `/` (not admin)

### Deliverable 11: Admin role enforcement

**Verify:**
1. Manually set a test user's `role` to `'admin'` in Supabase:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = '<user-id>';
   ```
2. Sign in as that user
3. Navigate to `/admin` → page loads
4. Sign in as a non-admin user
5. Navigate to `/admin` → redirected away
6. Directly access admin API/Server Actions → rejected

### Deliverable 12: Profile auto-creation with OAuth data

**Verify:** Same as Deliverable 5. Specifically confirm:
- `display_name` matches the OAuth provider's full name
- `avatar_url` is a valid image URL (paste into browser to check)
- Data is populated from Google's metadata (given_name, family_name, picture) and LinkedIn's metadata (name, picture)

### Deliverable 13: Deployed to Vercel

**Verify:**
- Production URL loads (e.g., `ethos-xyz.vercel.app`)
- Create a PR branch → Vercel generates a preview deployment URL
- Preview URL loads with the latest branch changes
- Environment variables are set in Vercel dashboard (not hardcoded)

### Deliverable 14: Supabase migrations in repo

**Verify:**
- `supabase/migrations/` directory exists in the repo
- Contains the schema and RLS migration files
- `npx supabase db reset` runs cleanly on a fresh local instance
- Running `npx supabase db push` against a fresh remote project applies all migrations

### End-to-End Smoke Test

The complete happy path:

1. Visit the production Vercel URL
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Arrive back at the app, logged in
5. Check the database: profile row exists with name + avatar
6. Navigate to `/dashboard` — page loads (authenticated)
7. Navigate to `/admin` — redirected to `/` (not admin)
8. Close browser, reopen URL — still logged in
9. Sign out
10. Navigate to `/dashboard` — redirected to `/login`

Repeat steps 2-10 with LinkedIn OIDC.

---

## RESEARCH COMPLETE
