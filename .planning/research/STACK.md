# Stack Research — Ethos Web Platform

**Analysis Date:** 2026-02-25
**Project:** Ethos (curated expert Q&A platform)
**Constraint:** Next.js + Supabase + Vercel + Tailwind CSS (decided)
**Research Scope:** Specific versions, patterns, and supporting libraries

**Methodology:** Based on stable releases through early 2025, npm registry state, and established patterns. Versions marked with `~` should be verified against npm before `create-next-app`. Confidence levels reflect how stable/settled each recommendation is.

---

## 1. Next.js — Version & Patterns

### Version: Next.js 15 (stable)

**Confidence: HIGH**

Next.js 15 has been stable since October 2024. It is the correct version for a new project in 2026. Do not use Next.js 14 (missing key improvements). Do not use a canary/RC unless there is a specific feature need.

```bash
npx create-next-app@latest ethos --app --tailwind --eslint --src-dir --import-alias "@/*"
```

### App Router (not Pages Router)

**Confidence: HIGH**

App Router is the default and recommended path since Next.js 13.4. Pages Router is legacy — still supported but receives no new features. All new patterns (Server Components, Server Actions, Parallel Routes, Intercepting Routes) are App Router only.

**Use App Router for everything.** No reason to mix.

### React Server Components (RSC)

**Confidence: HIGH**

Default in App Router. Components in `app/` are Server Components unless marked `'use client'`. This is the correct default for Ethos:

- **Server Components for:** Question feed pages, expert profile pages, answer archives, admin question management. These are read-heavy, benefit from server-side data fetching, and produce smaller client bundles.
- **Client Components for:** Answer submission form (textarea + character count + save), answer limit counter (real-time state), dark mode toggle, any interactive UI with useState/useEffect.

**Pattern:** Fetch data in Server Components, pass to Client Components as props. Keep the `'use client'` boundary as deep as possible.

```
app/
  page.jsx              ← Server Component (today's question + public answers)
  questions/
    [id]/page.jsx       ← Server Component (single question + all expert answers)
  experts/
    [slug]/page.jsx     ← Server Component (expert profile + answer history)
  dashboard/
    page.jsx            ← Server Component (shell) + Client Component (answer form)
  admin/
    questions/page.jsx  ← Server Component (question queue management)
```

### Server Actions

**Confidence: HIGH**

Server Actions replace the need for API routes for mutations. Use them for:

- Submitting an answer (write to Supabase)
- Creating/scheduling questions (admin)
- Toggling answer flags
- Profile updates

Server Actions are defined with `'use server'` and can be called directly from Client Components. They run on the server, have access to cookies/headers, and can revalidate cached data.

```javascript
// app/actions/answers.js
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitAnswer(questionId, content) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check monthly limit
  // Insert answer
  // Revalidate the question page
  revalidatePath(`/questions/${questionId}`)
}
```

**Do NOT use:** Traditional API routes (`app/api/`) for CRUD operations. Server Actions are simpler and type-safe. Reserve API routes only for webhooks, external integrations, or cron jobs.

### Route Handlers (API Routes)

**Confidence: HIGH**

Use `app/api/` routes sparingly:

- `app/api/auth/callback/route.js` — Supabase OAuth callback (required)
- `app/api/cron/publish-question/route.js` — Daily question publish (Vercel Cron)
- `app/api/og/route.js` — OG image generation (if using `@vercel/og`)

### Caching & Revalidation

**Confidence: MEDIUM** (Next.js caching semantics have changed across versions; verify current defaults)

Next.js 15 changed fetch caching defaults — fetches are no longer cached by default (they were in 14). This is actually better for Ethos since answer counts change frequently.

- **Static pages:** Question archive pages can use ISR with `revalidate: 60` (rebuild every minute)
- **Dynamic pages:** Today's question page, dashboard — use `dynamic = 'force-dynamic'` or no caching
- **On-demand revalidation:** `revalidatePath()` after Server Actions (answer submitted → revalidate question page)

### Middleware

**Confidence: HIGH**

Use Next.js middleware (`middleware.js` at root) for:

- Auth session refresh (Supabase requires this for SSR)
- Redirecting unauthenticated users from `/dashboard` to login
- Rate limiting headers (basic)

```javascript
// middleware.js
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
}
```

---

## 2. Supabase — Auth, Database, Realtime

### Client Library

**Package:** `@supabase/supabase-js` ~2.45+
**SSR Helper:** `@supabase/ssr` ~0.5+

**Confidence: HIGH**

`@supabase/ssr` is the official replacement for the deprecated `@supabase/auth-helpers-nextjs`. It handles cookie-based auth for Server Components, Server Actions, Route Handlers, and Middleware. This is required for Next.js App Router.

**Setup pattern (3 client factories):**

```
lib/supabase/
  client.js      ← createBrowserClient() for Client Components
  server.js      ← createServerClient() for Server Components / Server Actions
  middleware.js   ← createServerClient() with cookie get/set for middleware
```

### Auth: LinkedIn OAuth (OIDC)

**Confidence: HIGH**

Supabase supports LinkedIn via OIDC (OpenID Connect), not the legacy OAuth2 flow. LinkedIn migrated to "Sign In with LinkedIn using OpenID Connect" in 2023.

**Setup:**
1. Create a LinkedIn app at https://www.linkedin.com/developers/
2. Add the "Sign In with LinkedIn using OpenID Connect" product
3. Set redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. In Supabase Dashboard > Auth > Providers > LinkedIn (OIDC): enter Client ID + Client Secret
5. In the app: `supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc' })`

**Important:** The provider string is `linkedin_oidc`, not `linkedin`. The older `linkedin` provider is deprecated.

**Scopes granted:** `openid`, `profile`, `email` — sufficient for Ethos (name, email, profile photo).

### Auth: Google OAuth

**Confidence: HIGH**

Standard OAuth2 flow via Google Cloud Console.

**Setup:**
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Set redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. In Supabase Dashboard > Auth > Providers > Google: enter Client ID + Client Secret
4. In the app: `supabase.auth.signInWithOAuth({ provider: 'google' })`

### Auth: Social-Only Strategy

**Confidence: HIGH**

PROJECT.md specifies social login only (no email/password). Disable email auth in Supabase Dashboard > Auth > Providers. This simplifies the auth flow and eliminates password reset, email confirmation, etc.

**Post-login profile enrichment:**
- On first login, create a row in `profiles` table via a database trigger or Server Action
- Pull name, avatar URL, email from the OAuth provider metadata
- Let users edit their display name, bio, and slug (for `/experts/[slug]`)

### Row Level Security (RLS)

**Confidence: HIGH**

RLS is mandatory on Supabase (it's enabled by default on new tables). Every table needs explicit policies.

**Core patterns for Ethos:**

```sql
-- Answers: anyone can read published answers, only owner can insert
CREATE POLICY "Public answers are viewable by everyone"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own answers"
  ON answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers"
  ON answers FOR UPDATE
  USING (auth.uid() = user_id);

-- Questions: anyone can read published, only admins can manage
CREATE POLICY "Published questions are viewable by everyone"
  ON questions FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= now());

CREATE POLICY "Admins can manage all questions"
  ON questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Profiles: public read, owner update
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Admin role pattern:** Store a `role` enum (`user`, `editor`, `admin`) in the `profiles` table. Check it in RLS policies. Do NOT use Supabase custom claims for beta — the profiles-table approach is simpler and sufficient for 2-5 editors.

### Realtime Subscriptions

**Confidence: MEDIUM** (may not be needed for beta)

Supabase Realtime can push answer count updates to the question feed without polling. However, for a 20-50 user beta, this is likely overkill.

**Recommendation:** Skip realtime for beta. Use `revalidatePath()` after Server Actions to refresh data. Add Realtime later if the feed needs live updates at scale.

If added later:
```javascript
supabase.channel('answers')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers' },
    (payload) => { /* update answer count in UI */ })
  .subscribe()
```

### Database Functions & Triggers

**Confidence: HIGH**

Use Postgres functions for business logic that must be atomic:

```sql
-- Enforce monthly answer limit at the database level (not just app level)
CREATE OR REPLACE FUNCTION check_answer_limit()
RETURNS TRIGGER AS $$
DECLARE
  monthly_count INTEGER;
  monthly_limit INTEGER;
BEGIN
  SELECT count(*) INTO monthly_count
  FROM answers
  WHERE user_id = NEW.user_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';

  SELECT CASE WHEN role = 'premium' THEN 5 ELSE 3 END INTO monthly_limit
  FROM profiles WHERE id = NEW.user_id;

  IF monthly_count >= monthly_limit THEN
    RAISE EXCEPTION 'Monthly answer limit reached';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_answer_limit
  BEFORE INSERT ON answers
  FOR EACH ROW
  EXECUTE FUNCTION check_answer_limit();
```

**Why at DB level:** Prevents race conditions and client-side bypasses. The app should also check the limit in the UI (for UX), but the trigger is the enforcement.

---

## 3. Database Schema

**Confidence: HIGH** (standard patterns, adapted for scarcity mechanics)

### Core Tables

```sql
-- Users/profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'editor', 'admin')),
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions (curated by editorial team)
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  context TEXT,                    -- optional editorial context/framing
  slug TEXT UNIQUE NOT NULL,       -- URL-friendly: "what-makes-a-great-leader"
  published_at TIMESTAMPTZ,       -- NULL = draft, set = published (scheduled)
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Answers (the core content — scarcity-limited)
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One answer per user per question
  UNIQUE (question_id, user_id)
);

-- Answer usage tracking (denormalized for fast limit checks)
CREATE VIEW monthly_answer_counts AS
  SELECT
    user_id,
    date_trunc('month', created_at) AS month,
    count(*) AS answer_count
  FROM answers
  GROUP BY user_id, date_trunc('month', created_at);
```

### Indexes

```sql
-- Question feed (published, ordered by date)
CREATE INDEX idx_questions_published ON questions (published_at DESC)
  WHERE published_at IS NOT NULL;

-- Answers by question (question feed view)
CREATE INDEX idx_answers_question ON answers (question_id, created_at DESC);

-- Answers by user (expert profile view)
CREATE INDEX idx_answers_user ON answers (user_id, created_at DESC);

-- Monthly limit check
CREATE INDEX idx_answers_user_month ON answers (user_id, created_at);

-- Profile slug lookup
CREATE INDEX idx_profiles_slug ON profiles (slug);

-- Question slug lookup
CREATE INDEX idx_questions_slug ON questions (slug);
```

### Queue Visibility (Tiered Preview)

```sql
-- Function to get visible question queue for a user
CREATE OR REPLACE FUNCTION get_question_queue(requesting_user_id UUID)
RETURNS SETOF questions AS $$
DECLARE
  user_tier TEXT;
  preview_days INTEGER;
BEGIN
  SELECT tier INTO user_tier FROM profiles WHERE id = requesting_user_id;

  -- Free: 3 days ahead, Premium: 30 days ahead
  preview_days := CASE WHEN user_tier = 'premium' THEN 30 ELSE 3 END;

  RETURN QUERY
    SELECT * FROM questions
    WHERE published_at IS NOT NULL
      AND published_at <= now() + (preview_days || ' days')::interval
    ORDER BY published_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Schema Design Decisions

| Decision | Rationale |
|----------|-----------|
| UUID primary keys | Standard for Supabase; avoids sequential ID enumeration |
| Slug columns on questions and profiles | Clean URLs (`/questions/what-makes-a-great-leader`, `/experts/keith-obrien`) |
| `published_at` for scheduling | NULL = draft, future date = scheduled, past date = live. Single field handles all states. |
| `UNIQUE (question_id, user_id)` on answers | Enforces one answer per question per expert at the DB level |
| Separate `profiles` from `auth.users` | Supabase pattern — `auth.users` is managed by Supabase Auth; `profiles` holds app-specific data |
| View for monthly counts | Avoids denormalization while keeping limit checks readable |
| `SECURITY DEFINER` on queue function | Allows the function to read profiles table regardless of RLS |

---

## 4. Tailwind CSS — Version Choice

### Recommendation: Tailwind CSS v4 (stable)

**Confidence: MEDIUM-HIGH**

Tailwind CSS v4 went stable in January 2025. It is a major rewrite with a new engine (Oxide), CSS-first configuration (no `tailwind.config.js`), and significantly faster builds.

**Next.js compatibility:** `create-next-app` with the `--tailwind` flag installs Tailwind v4 by default as of recent versions. The `@tailwindcss/postcss` package replaces the old PostCSS plugin setup.

**Setup for Next.js 15:**

```bash
npm install tailwindcss @tailwindcss/postcss
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-warm-50: #faf5f0;
  --color-warm-100: #f0e6d8;
  /* ... Ethos warm palette */
  --color-warm-900: #2d1f0e;

  --font-sans: 'Inter', sans-serif;
}
```

**Key v4 differences from v3:**
- Config is in CSS (`@theme`), not `tailwind.config.js`
- No `content` paths needed (automatic detection)
- Dark mode via CSS `prefers-color-scheme` by default (can override to class-based)
- New color palette (P3 gamut support)
- Faster builds (Rust-based Oxide engine)

**Fallback position:** If v4 has compatibility issues with any chosen library, Tailwind v3.4 is rock-solid and well-supported. This is unlikely but worth noting.

**Do NOT use:** Tailwind v3 for a greenfield project in 2026 unless a specific dependency requires it.

---

## 5. Supporting Libraries

### Authentication Helper

**Package:** `@supabase/ssr` ~0.5+
**Confidence: HIGH**

Required for cookie-based auth in Next.js App Router. Replaces the deprecated `@supabase/auth-helpers-nextjs`.

### Date Handling

**Package:** `date-fns` ~4.1+
**Confidence: HIGH**

Lightweight, tree-shakeable, no global mutation (unlike Moment or Luxon). Used for:
- "Published 3 hours ago" relative timestamps
- Monthly answer limit period calculations
- Question scheduling in admin panel
- Week/month grouping for feeds

**Do NOT use:**
- `moment` — deprecated, massive bundle
- `dayjs` — fine but date-fns has better tree-shaking and TypeScript support
- `luxon` — overkill for this use case
- Native `Intl.RelativeTimeFormat` alone — insufficient for complex date math

### Rich Text for Answers

**Recommendation: Plain textarea with Markdown preview (no rich text editor)**

**Confidence: HIGH**

Answers in Ethos are short-form (likely 100-500 words). A rich text editor adds complexity, bundle size, and maintenance burden that is not justified for the product. Expert answers should be concise text, not formatted documents.

**Implementation:**
- `<textarea>` with character/word count
- Optional: render stored answers with `react-markdown` ~9.0+ for basic formatting (bold, italic, links, paragraphs)
- Store answers as plain text or minimal Markdown

**Package:** `react-markdown` ~9.0+ (for rendering only, not editing)
**Confidence: HIGH**

If rich text editing becomes needed later:
- `tiptap` (ProseMirror-based) would be the choice — modular, headless, good React integration
- But do NOT add this for beta

**Do NOT use:**
- `draft-js` — deprecated by Meta
- `slate` — powerful but complex, maintenance concerns
- `quill` — aging, React integration is fragile
- `@editorjs/editorjs` — block editor, wrong paradigm for short answers

### OG Image Generation (Social Sharing)

**Package:** `@vercel/og` ~0.6+
**Confidence: HIGH**

Generates dynamic OG images at the edge using Vercel's Satori engine. Perfect for shareable answer cards on LinkedIn/Twitter.

```javascript
// app/api/og/route.js
import { ImageResponse } from '@vercel/og'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const question = searchParams.get('question')
  const expert = searchParams.get('expert')
  const answer = searchParams.get('answer')

  return new ImageResponse(
    (
      <div style={{ /* Ethos branded card layout */ }}>
        <p>{question}</p>
        <blockquote>{answer}</blockquote>
        <p>— {expert}</p>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

**Why `@vercel/og`:** Runs at the edge on Vercel (no server-side Chromium), fast, uses JSX for layout, free on Vercel's free tier.

**Do NOT use:**
- `puppeteer` / `playwright` for OG images — heavy, slow, expensive at scale
- Static OG images — defeats the purpose (each answer should have its own card)

### Analytics

**Recommendation: Vercel Analytics + Vercel Web Vitals (built-in)**

**Confidence: HIGH**

For beta (20-50 users), Vercel's built-in analytics are sufficient and free:

```bash
npm install @vercel/analytics @vercel/speed-insights
```

```javascript
// app/layout.jsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

For answer-level analytics (view counts, share clicks) — store in Supabase with a simple `answer_views` table and increment via Server Action. No need for a third-party analytics platform at beta scale.

**Do NOT use:**
- Google Analytics — overkill, privacy concerns, complex setup
- Mixpanel/Amplitude — premature for beta; add when you need funnel analysis
- Plausible/Fathom — good but unnecessary cost when Vercel Analytics is free

### Slug Generation

**Package:** `slugify` ~1.6+ (or hand-roll with a 5-line utility)

**Confidence: MEDIUM**

Needed for question URLs and expert profile URLs. Simple enough to write by hand, but `slugify` handles edge cases (unicode, special chars).

Alternatively, generate slugs in a Postgres function:

```sql
CREATE OR REPLACE FUNCTION generate_slug(input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(input, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;
```

### Font

**Package:** `@fontsource/inter` ~5.2+ (or use `next/font/google`)

**Confidence: HIGH**

Next.js has built-in font optimization via `next/font`. Prefer this over `@fontsource`:

```javascript
// app/layout.jsx
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  return <html className={inter.className}>...</html>
}
```

**Do NOT use:** `@fontsource/inter` with Next.js — `next/font` is better optimized (preloads, no layout shift, self-hosted automatically).

### Form Handling

**Recommendation: React 19 `useActionState` + Server Actions (no library needed)**

**Confidence: HIGH**

React 19 (ships with Next.js 15) has built-in form handling:

```javascript
'use client'
import { useActionState } from 'react'
import { submitAnswer } from '@/app/actions/answers'

function AnswerForm({ questionId }) {
  const [state, formAction, pending] = useActionState(submitAnswer, null)

  return (
    <form action={formAction}>
      <input type="hidden" name="questionId" value={questionId} />
      <textarea name="content" required />
      <button type="submit" disabled={pending}>
        {pending ? 'Submitting...' : 'Submit Answer'}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  )
}
```

**Do NOT use:**
- `react-hook-form` — excellent library but unnecessary when Server Actions + `useActionState` cover the use case
- `formik` — aging, heavier, less React 19-aligned
- `zod` for client-side validation is fine to add if needed (see below)

### Validation

**Package:** `zod` ~3.23+
**Confidence: HIGH**

Lightweight schema validation for Server Actions. Validates input on the server side before database writes.

```javascript
import { z } from 'zod'

const answerSchema = z.object({
  questionId: z.string().uuid(),
  content: z.string().min(10).max(5000),
})
```

**Why zod:** Standard in the Next.js ecosystem, works well with Server Actions, small bundle (only imported server-side).

### Environment Variable Validation

**Package:** `@t3-oss/env-nextjs` ~0.11+ (optional)
**Confidence: MEDIUM**

Validates env vars at build time. Prevents deploying with missing Supabase keys. Nice to have but not critical for beta.

---

## 6. What NOT to Use

| Library/Pattern | Why Not |
|-----------------|---------|
| **Pages Router** | Legacy. App Router is the standard for new Next.js projects. |
| **`@supabase/auth-helpers-nextjs`** | Deprecated. Use `@supabase/ssr` instead. |
| **Prisma** | Adds an ORM layer over Supabase's Postgres client. Unnecessary complexity — use Supabase JS client + raw SQL for migrations. |
| **Drizzle ORM** | Same reasoning as Prisma. Supabase client is sufficient for this scale. |
| **NextAuth.js / Auth.js** | Conflicts with Supabase Auth. Supabase handles the full auth flow including OAuth, session management, and RLS integration. Do not run two auth systems. |
| **Redux / Zustand / Jotai** | No complex client state to manage. Server Components fetch data; Client Components use `useState` for local UI state. |
| **Styled Components / CSS Modules** | Tailwind covers all styling needs. Mixing paradigms adds confusion. |
| **Moment.js** | Deprecated. Use `date-fns`. |
| **Draft.js / Slate** | Overkill for short-form text answers. Plain textarea + optional Markdown rendering. |
| **Puppeteer for OG images** | Heavy. `@vercel/og` is purpose-built for this on Vercel. |
| **Firebase** | Conflicts with Supabase. Do not mix BaaS platforms. |
| **tRPC** | Over-engineering for this project. Server Actions provide type-safe server mutations without the complexity. |
| **Contentlayer / MDX** | Questions are in the database, not in files. No static content pipeline needed. |
| **Tailwind UI / Headless UI** | Paid / adds dependency for components that are simple to build. Build custom components for beta — the UI is minimal. |
| **shadcn/ui** | Tempting but adds a lot of component code to maintain. For a solo operator building a focused product, hand-built Tailwind components are faster to iterate on and easier to understand. Revisit if the admin panel grows complex. |

---

## 7. Complete Dependency List

### Production Dependencies

| Package | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `next` | ~15.1+ | Framework (App Router, RSC, Server Actions) | HIGH |
| `react` | ~19.0+ | UI library (ships with Next.js 15) | HIGH |
| `react-dom` | ~19.0+ | DOM rendering | HIGH |
| `@supabase/supabase-js` | ~2.45+ | Supabase client (DB queries, auth) | HIGH |
| `@supabase/ssr` | ~0.5+ | Cookie-based auth for Next.js SSR | HIGH |
| `date-fns` | ~4.1+ | Date formatting and math | HIGH |
| `react-markdown` | ~9.0+ | Render Markdown in answers | HIGH |
| `zod` | ~3.23+ | Server-side input validation | HIGH |
| `@vercel/analytics` | ~1.4+ | Page view analytics | HIGH |
| `@vercel/speed-insights` | ~1.0+ | Core Web Vitals | HIGH |
| `@vercel/og` | ~0.6+ | Dynamic OG image generation | HIGH |

### Development Dependencies

| Package | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `tailwindcss` | ~4.0+ | Utility-first CSS | MEDIUM-HIGH |
| `@tailwindcss/postcss` | ~4.0+ | PostCSS integration for Next.js | MEDIUM-HIGH |
| `eslint` | ~9.0+ | Linting (ships with create-next-app) | HIGH |
| `eslint-config-next` | ~15.0+ | Next.js ESLint rules | HIGH |
| `supabase` | ~1.200+ | Supabase CLI (local dev, migrations) | HIGH |

### Total: ~11 production, ~5 dev dependencies

This is deliberately minimal. Each addition should clear the bar: "Does this save more time than it costs in maintenance?"

---

## 8. Development Workflow

### Local Supabase

**Confidence: HIGH**

Use the Supabase CLI for local development:

```bash
npx supabase init
npx supabase start       # Starts local Postgres, Auth, Storage, etc.
npx supabase db reset    # Runs migrations fresh
npx supabase migration new <name>  # Create new migration
```

Local development runs against a Docker-based Supabase instance. Migrations are SQL files in `supabase/migrations/`. Push to production with `npx supabase db push`.

### Environment Variables

```
# .env.local (never committed)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321      # local
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                  # local anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...                      # server-only, for admin ops
```

`NEXT_PUBLIC_` prefix exposes vars to the browser (needed for client-side Supabase client). `SUPABASE_SERVICE_ROLE_KEY` is server-only (Server Actions, Route Handlers).

### Vercel Deployment

- Connect GitHub repo to Vercel
- Set environment variables in Vercel dashboard
- Automatic deploys on push to `main`
- Preview deploys on PRs
- Vercel Cron for daily question publishing

---

## 9. Open Questions

| Question | Impact | When to Decide |
|----------|--------|----------------|
| Tailwind v4 stability with `@vercel/og` JSX | May need inline styles for OG images regardless | During OG image implementation |
| `react-markdown` bundle size vs. a simpler custom renderer | Minimal — only used on answer display pages | During answer rendering implementation |
| Supabase free tier limits (500MB DB, 50K auth users, 2GB bandwidth) | Fine for beta; monitor as usage grows | Post-beta if traction warrants |
| Image uploads for expert avatars (Supabase Storage vs. OAuth avatar URL) | OAuth avatars may be sufficient for beta | During profile implementation |
| Email notifications for "your question goes live tomorrow" | Requires Supabase Edge Functions or external email service | Post-beta feature |
| Full-text search on questions and answers | Supabase supports Postgres `tsvector`; add when content volume justifies it | Post-beta |

---

## 10. Version Verification Checklist

Before running `create-next-app`, verify these versions against npm:

```bash
npm view next version
npm view @supabase/supabase-js version
npm view @supabase/ssr version
npm view tailwindcss version
npm view @tailwindcss/postcss version
npm view date-fns version
npm view react-markdown version
npm view zod version
npm view @vercel/og version
```

Versions in this document are based on stable releases through early 2025. Minor version bumps are expected and should be safe.

---

*Research based on stable releases and established patterns. Web search/fetch unavailable at analysis time — versions marked with `~` should be confirmed against npm registry before project initialization.*
