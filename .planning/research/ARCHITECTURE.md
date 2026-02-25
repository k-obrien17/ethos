# Architecture Research — Ethos Platform

**Analysis Date:** 2026-02-25
**Context:** Next.js + Supabase content platform with scarcity mechanics (limited monthly answers)
**Scope:** Architecture patterns, data flow, component boundaries, build order

---

## 1. Next.js App Router: Server Components vs Client Components

### The Decision Framework

Next.js App Router defaults everything to Server Components. You opt into Client Components only where needed by adding `'use client'` at the top of a file. The boundary is the file — once marked, everything imported by that file is also client-bundled.

**Server Components (default) — use for:**
- Page shells, layouts, and content display
- Data fetching (direct database/API calls without exposing credentials)
- Static or cacheable content (question cards, answer displays, profiles)
- SEO-critical content (public feeds, shareable answer pages)
- Reducing client JS bundle size

**Client Components (`'use client'`) — use for:**
- Interactive forms (answer textarea, question editor in admin)
- State management (expanded/collapsed cards, modal visibility, form state)
- Event handlers (onClick, onChange, onSubmit)
- Browser APIs (clipboard for sharing, localStorage for preferences)
- Real-time UI updates (answer count remaining, countdown timers)

### Application to Ethos

| Page/Component | Server or Client | Rationale |
|---|---|---|
| Public question feed (`/`) | Server | Static content, SEO, cacheable |
| Individual question page (`/q/[slug]`) | Server | SEO for sharing, data fetch |
| Answer display cards | Server | Read-only content |
| Answer submit form | Client | Textarea, submit handler, state |
| Expert profile page (`/expert/[handle]`) | Server | Public, SEO, cacheable |
| Admin question queue (`/admin/questions`) | Client-heavy | Drag-reorder, edit forms, scheduling |
| Navigation/header | Server shell + Client auth state | Auth indicator needs client state |
| Share button | Client | Clipboard API, click handler |
| Answer limit indicator ("2 of 3 used") | Client | Needs auth state, real-time update |
| Dark mode toggle / theme | Client (provider at layout level) | Uses context + localStorage |

### Key Pattern: Server Component Shell with Client Islands

```
app/q/[slug]/page.jsx          ← Server Component (fetches question + answers)
  └── <AnswerList answers={answers} />   ← Server Component (renders answer cards)
  └── <AnswerForm questionId={id} />     ← Client Component (textarea, submit)
  └── <ShareButton url={shareUrl} />     ← Client Component (clipboard)
```

The page fetches data on the server, renders the read-only parts as Server Components, and drops in Client Components only for interactive elements. This minimizes client JS and maximizes SEO/caching.

### Practical Rules for Ethos

1. **Pages and layouts are always Server Components** — they fetch data and compose the page
2. **Forms, modals, and interactive widgets are Client Components** — wrap them in their own files with `'use client'`
3. **Pass data down as props** — Server Components fetch, Client Components receive serializable props
4. **Context providers are Client Components** — wrap them around `{children}` in a layout, but keep the layout itself as a Server Component
5. **Use `server-only` package** — import it in any module that touches Supabase service keys or admin credentials to prevent accidental client bundling

---

## 2. Supabase Row Level Security for Multi-Role Apps

### Role Model for Ethos

Ethos has three distinct access levels:

| Role | Supabase Auth State | Capabilities |
|---|---|---|
| **Public reader** | `anon` (not authenticated) | Read published questions, read published answers, view expert profiles |
| **Expert (answerer)** | Authenticated user with `role = 'expert'` | Everything public + submit answers (within limit), edit own answers, manage own profile |
| **Admin (editor)** | Authenticated user with `role = 'admin'` | Everything expert + manage question queue, manage users, view analytics |

### RLS Design Patterns

#### Pattern 1: Public Read, Authenticated Write

The most common pattern for Ethos. Public content is readable by everyone; only the owning expert can write.

```sql
-- Questions table: public read, admin write
CREATE POLICY "Questions are publicly readable"
  ON questions FOR SELECT
  USING (status = 'published' AND publish_date <= now());

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

#### Pattern 2: Owner-Scoped Write with Public Read

Answers are publicly readable but only writable by their author.

```sql
-- Answers: public read, expert write (own only)
CREATE POLICY "Published answers are publicly readable"
  ON answers FOR SELECT
  USING (true);  -- all answers are public once submitted

CREATE POLICY "Experts can insert own answers"
  ON answers FOR INSERT
  WITH CHECK (
    auth.uid() = expert_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('expert', 'admin')
    )
  );

CREATE POLICY "Experts can update own answers"
  ON answers FOR UPDATE
  USING (auth.uid() = expert_id)
  WITH CHECK (auth.uid() = expert_id);
```

#### Pattern 3: Role Stored in Profiles Table

Supabase does not natively support custom roles in JWTs (without custom claims). The standard pattern is a `profiles` table with a `role` column, checked via subquery in RLS policies.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'expert' CHECK (role IN ('expert', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### Pattern 4: Answer Limit Enforcement in RLS

RLS can enforce the monthly answer limit at the database level, preventing race conditions that client-side checks alone cannot prevent.

```sql
CREATE POLICY "Experts limited to monthly answer budget"
  ON answers FOR INSERT
  WITH CHECK (
    auth.uid() = expert_id
    AND (
      SELECT COUNT(*)
      FROM answers
      WHERE expert_id = auth.uid()
      AND date_trunc('month', created_at) = date_trunc('month', now())
    ) < (
      SELECT answer_limit
      FROM profiles
      WHERE id = auth.uid()
    )
  );
```

This is the single most important RLS policy in the system. It makes the scarcity mechanic server-enforced and immune to client manipulation.

### RLS Best Practices for Ethos

1. **Enable RLS on every table** — no exceptions, even if a table "should" be public
2. **Default deny** — RLS enabled with no policies means no access; add policies to grant
3. **Check role via profiles table** — `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`
4. **Use `SECURITY DEFINER` functions for complex logic** — when a policy needs to span tables or do calculations, wrap it in a function
5. **Test with different auth states** — Supabase dashboard lets you test RLS as anon, specific user, or service role
6. **Service role key bypasses RLS** — use it only in server-side code (Next.js API routes, Edge Functions), never expose to client
7. **Separate read and write policies** — SELECT policy can be permissive (public reads); INSERT/UPDATE/DELETE policies should be restrictive

---

## 3. Question Scheduling System Design

### Requirements

- Editorial team queues questions with scheduled publish dates
- One question publishes per day at a consistent time
- Users can preview upcoming questions (tiered by plan)
- Admins can reorder the queue (change publish dates)

### Option A: Publish Date Column + Query Filter (Recommended)

The simplest approach. Each question has a `publish_date` column. "Publishing" is just a query filter.

```sql
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  body TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  publish_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- "Today's question" is just a query
SELECT * FROM questions
WHERE publish_date = CURRENT_DATE
AND status IN ('scheduled', 'published')
LIMIT 1;

-- "Upcoming questions" for premium users
SELECT * FROM questions
WHERE publish_date > CURRENT_DATE
AND publish_date <= CURRENT_DATE + INTERVAL '30 days'
AND status = 'scheduled'
ORDER BY publish_date ASC;
```

**How "publishing" happens:** It does not require a cron job. The RLS policy on `questions` filters by `publish_date <= now()` for public readers. A question becomes visible the moment its date arrives. No background process needed.

```sql
-- Public readers only see today and past questions
CREATE POLICY "Public sees published questions"
  ON questions FOR SELECT
  USING (
    publish_date <= CURRENT_DATE
    AND status IN ('scheduled', 'published')
  );

-- Premium experts see upcoming queue (tiered)
CREATE POLICY "Experts see upcoming queue"
  ON questions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND status = 'scheduled'
    AND publish_date <= CURRENT_DATE + INTERVAL '30 days'
  );
```

**Pros:** No moving parts, no cron, no race conditions. Query-time filtering is simpler and more reliable than state-mutation cron jobs.

**Cons:** If you want to do something on publish (send notification, update a cache), you need a separate mechanism.

### Option B: pg_cron for Side Effects (Optional Enhancement)

If you need actions at publish time (notifications, cache invalidation, analytics), use Supabase's pg_cron extension.

```sql
-- Supabase has pg_cron built in
-- Schedule a daily job at midnight UTC
SELECT cron.schedule(
  'publish-daily-question',
  '0 0 * * *',  -- midnight UTC daily
  $$
    UPDATE questions
    SET status = 'published'
    WHERE publish_date = CURRENT_DATE
    AND status = 'scheduled';
  $$
);
```

**When to use pg_cron:** Only if status transition triggers side effects (notifications, cache busting). For Ethos beta, Option A alone is sufficient — skip the cron and use query-time filtering.

### Option C: Supabase Edge Functions (for Complex Logic)

If publish-time logic is complex (call external APIs, send emails, generate OG images), use a Supabase Edge Function triggered by pg_cron or a Vercel cron.

```typescript
// supabase/functions/publish-daily-question/index.ts
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  const { data } = await supabase
    .from('questions')
    .update({ status: 'published' })
    .eq('publish_date', new Date().toISOString().slice(0, 10))
    .eq('status', 'scheduled')
    .select();

  // Could trigger notifications, OG image generation, etc.
  return new Response(JSON.stringify({ published: data?.length }));
});
```

**Recommendation for beta:** Use Option A (publish date column + query filter). No cron, no edge function. Add Option B or C when you need publish-time side effects.

### Timezone Handling

- **Store all dates as DATE (not TIMESTAMPTZ) for publish_date** — a question is published on a calendar date, not a timestamp
- **Compare against `CURRENT_DATE`** — Postgres evaluates this in the server's timezone (UTC on Supabase)
- **Display in user's timezone** — use `Intl.DateTimeFormat` on the client to show "Today's Question" correctly
- **Edge case:** A question published "today" in UTC may not be "today" for a user in Hawaii. For beta (US-focused), this is a minor issue. If it matters later, use `CURRENT_DATE AT TIME ZONE 'America/New_York'` or let the client pass its date and query accordingly

### Queue Reordering

Admins reorder by changing `publish_date` values. The admin UI shows a calendar or list view where dates can be reassigned.

```sql
-- Swap two questions' dates
UPDATE questions SET publish_date = '2026-03-15' WHERE id = 'q1';
UPDATE questions SET publish_date = '2026-03-10' WHERE id = 'q2';
```

No special "position" column needed. The publish date IS the position.

---

## 4. Answer Limit Enforcement

### The Scarcity Mechanic

This is the core differentiator. Experts get 3 answers/month (free) or 5+/month (premium). Every enforcement gap undermines the product.

### Three Layers of Enforcement

#### Layer 1: Client-Side (UX Guidance)

```jsx
// Client component shows remaining budget
const remaining = answerLimit - usedThisMonth;

if (remaining <= 0) {
  return <div>You've used all {answerLimit} answers this month.</div>;
}

return <AnswerForm remaining={remaining} />;
```

**Purpose:** UX, not security. Prevents accidental submissions but can be bypassed.

#### Layer 2: Server-Side API Route (Validation)

```javascript
// app/api/answers/route.js
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Check limit before insert
  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('expert_id', user.id)
    .gte('created_at', startOfMonth());

  const { data: profile } = await supabase
    .from('profiles')
    .select('answer_limit')
    .eq('id', user.id)
    .single();

  if (count >= profile.answer_limit) {
    return Response.json({ error: 'Monthly limit reached' }, { status: 403 });
  }

  // Proceed with insert
  const body = await request.json();
  const { data, error } = await supabase
    .from('answers')
    .insert({
      expert_id: user.id,
      question_id: body.questionId,
      body: body.answer,
    })
    .select()
    .single();

  return Response.json(data);
}
```

**Purpose:** Application-level enforcement with proper error messages.

#### Layer 3: Database RLS (Absolute Enforcement)

The RLS policy from Section 2 is the final backstop. Even if the API route has a bug, the database itself rejects over-limit inserts.

### Race Condition Prevention

Two simultaneous requests could both pass the count check and both insert, exceeding the limit. Solutions:

**Option A: Advisory Lock (Recommended for Supabase)**

Use a Postgres function with an advisory lock:

```sql
CREATE OR REPLACE FUNCTION submit_answer(
  p_expert_id UUID,
  p_question_id UUID,
  p_body TEXT
) RETURNS answers AS $$
DECLARE
  v_count INT;
  v_limit INT;
  v_answer answers;
BEGIN
  -- Advisory lock on expert_id prevents concurrent submissions
  PERFORM pg_advisory_xact_lock(hashtext(p_expert_id::text));

  SELECT answer_limit INTO v_limit
  FROM profiles WHERE id = p_expert_id;

  SELECT COUNT(*) INTO v_count
  FROM answers
  WHERE expert_id = p_expert_id
  AND created_at >= date_trunc('month', now());

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Monthly answer limit reached';
  END IF;

  INSERT INTO answers (expert_id, question_id, body)
  VALUES (p_expert_id, p_question_id, p_body)
  RETURNING * INTO v_answer;

  RETURN v_answer;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Option B: Unique Partial Index (Simpler)**

If an expert can answer each question only once:

```sql
CREATE UNIQUE INDEX one_answer_per_question
  ON answers (expert_id, question_id);
```

This prevents duplicate answers to the same question (a natural constraint) but does not enforce the monthly cap alone. Combine with the RLS policy or the Postgres function above.

### Monthly Reset Logic

No reset job needed. The count query filters by `created_at >= date_trunc('month', now())`. When the month rolls over, the count naturally resets to 0.

**Display logic:**
```javascript
function getMonthlyUsage(answers) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  return answers.filter(a => new Date(a.created_at) >= startOfMonth).length;
}
```

---

## 5. Data Flow Patterns

### Daily Question Publishing

```
Admin creates question in admin panel
  → INSERT INTO questions (body, slug, category, publish_date, status='scheduled')
  → Question sits in queue

User visits homepage on publish_date
  → Server Component: SELECT * FROM questions WHERE publish_date = CURRENT_DATE
  → Question renders with answer cards
  → No cron needed — query-time filtering
```

### Answer Submission Flow

```
Expert opens question page
  → Server Component fetches question + existing answers
  → Client Component: <AnswerForm> checks remaining budget (client-side)

Expert submits answer
  → POST /api/answers { questionId, body }
  → API route: check auth → check monthly count → insert
  → Database: RLS policy double-checks limit
  → Response: new answer data
  → Client: optimistic UI update + revalidate page

Page revalidation
  → Next.js revalidatePath('/q/[slug]') or revalidateTag('question-answers')
  → Other visitors see new answer on next page load
```

### Feed Generation

#### Question-Centric Feed (Homepage)

```sql
-- Today's question with answer count
SELECT q.*, COUNT(a.id) AS answer_count
FROM questions q
LEFT JOIN answers a ON a.question_id = q.id
WHERE q.publish_date <= CURRENT_DATE
AND q.status IN ('scheduled', 'published')
ORDER BY q.publish_date DESC
LIMIT 30;
```

Render as a Server Component. Cacheable with ISR (revalidate every 60 seconds or on-demand when a new answer is submitted).

#### Person-Centric Feed (Expert Profile)

```sql
-- Expert's answer history with question context
SELECT a.*, q.body AS question_body, q.slug AS question_slug, q.publish_date
FROM answers a
JOIN questions q ON q.id = a.question_id
WHERE a.expert_id = $1
ORDER BY a.created_at DESC;
```

Also a Server Component. The profile page (`/expert/[handle]`) fetches this and renders the answer archive.

### Social Sharing Flow

#### Shareable URLs

```
Question page:  /q/daily-leadership-question-2026-03-15
Expert profile: /expert/keithobrien
Specific answer: /q/daily-leadership-question-2026-03-15#answer-{uuid}
```

#### OG Meta Tags (Dynamic)

Next.js App Router supports `generateMetadata` for dynamic OG tags:

```javascript
// app/q/[slug]/page.jsx
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const question = await getQuestion(slug);
  const answerCount = await getAnswerCount(question.id);

  return {
    title: question.body,
    description: `${answerCount} expert answers on Ethos`,
    openGraph: {
      title: question.body,
      description: `${answerCount} experts weighed in`,
      type: 'article',
      url: `https://ethos.app/q/${slug}`,
      images: [{
        url: `https://ethos.app/api/og?q=${slug}`,  // Dynamic OG image
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: question.body,
    },
  };
}
```

#### Dynamic OG Images (Optional Enhancement)

Next.js has built-in `ImageResponse` for generating OG images at the edge:

```javascript
// app/api/og/route.jsx
import { ImageResponse } from 'next/og';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('q');
  const question = await getQuestion(slug);

  return new ImageResponse(
    <div style={{ display: 'flex', fontSize: 48, background: '#faf5f0' }}>
      <h1>{question.body}</h1>
      <p>ethos.app</p>
    </div>,
    { width: 1200, height: 630 }
  );
}
```

**For beta:** Static OG meta tags are sufficient. Dynamic OG images are a nice-to-have.

---

## 6. Component Boundaries

### Admin Panel Architecture

#### Option A: Separate Layout Group (Recommended)

```
app/
  (public)/              ← Public layout group
    layout.jsx           ← Public shell (header, footer, nav)
    page.jsx             ← Homepage / question feed
    q/[slug]/page.jsx    ← Question detail
    expert/[handle]/page.jsx ← Expert profile
  (auth)/                ← Authenticated layout group
    layout.jsx           ← Auth-required shell (redirects if not logged in)
    dashboard/page.jsx   ← Expert dashboard (my answers, remaining budget)
    answer/[qid]/page.jsx ← Answer submission page
  (admin)/               ← Admin layout group
    layout.jsx           ← Admin shell (sidebar nav, admin header)
    admin/
      page.jsx           ← Admin dashboard
      questions/page.jsx ← Question queue management
      experts/page.jsx   ← Expert management
      analytics/page.jsx ← Platform analytics
  layout.jsx             ← Root layout (fonts, providers, global styles)
```

**How it works:**
- Route groups `(public)`, `(auth)`, `(admin)` share different layouts but all live under the same domain
- No separate deployment, no separate app
- Each layout can enforce its own auth requirements

#### Admin Auth Protection

**Middleware approach:**

```javascript
// middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { /* cookie handlers */ } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
```

**Layout approach (complementary):**

```javascript
// app/(admin)/layout.jsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  return (
    <div className="flex">
      <AdminSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

**Use both:** Middleware provides fast early rejection (before rendering). Layout provides server-side auth check with proper data loading. Belt and suspenders.

### Public Feed vs Expert Experience

| Concern | Public (unauthenticated) | Expert (authenticated) |
|---|---|---|
| Question feed | Full access | Full access + queue preview |
| Answers | Read-only | Read + submit (within limit) |
| Profiles | View any | View any + edit own |
| Answer limit | Not shown | Shown in header/dashboard |
| Share buttons | Visible | Visible |
| Admin panel | Hidden, 404 | Hidden unless admin role |

The same pages serve both audiences. The difference is:
- Server Components conditionally render the "Answer" button when authenticated
- Client Components check auth state for interactive features
- RLS ensures database-level separation regardless of UI

---

## 7. Suggested Build Order

### Phase 1: Foundation (Must Build First)

Everything else depends on these.

```
1. Next.js project setup
   - App Router, Tailwind CSS, Supabase client config
   - Root layout, fonts, global styles
   - Environment variables (.env.local)

2. Supabase schema + RLS
   - profiles table (auto-created on signup)
   - questions table (with publish_date, status, slug)
   - answers table (with expert_id, question_id, body)
   - RLS policies for all three tables
   - answer_limit column on profiles (default: 3)

3. Authentication
   - Supabase Auth with Google + LinkedIn OAuth
   - Login/logout flow
   - Middleware for protected routes
   - Profile creation trigger (on signup)
```

**Checkpoint:** Can sign up, sign in, and see a profile record in the database.

### Phase 2: Core Content Loop (The Product)

The daily question -> answer -> public feed loop.

```
4. Admin: Question creation
   - /admin/questions page (list + create form)
   - Set publish_date, category, slug
   - Status management (draft → scheduled)

5. Public question feed
   - Homepage: list published questions (today + recent)
   - /q/[slug] page: question detail with answers
   - Server Components for SEO + performance

6. Answer submission
   - Answer form (Client Component) on question page
   - POST /api/answers route with limit enforcement
   - RLS backstop on database
   - Show remaining monthly budget in UI

7. Expert profile
   - /expert/[handle] page
   - Answer history (person-centric feed)
   - Editable profile (display name, bio, handle)
```

**Checkpoint:** Admin can schedule questions. Experts can answer (within limit). Public can browse questions and answers.

### Phase 3: Platform Features (Differentiation)

Features that make the scarcity mechanic interesting.

```
8. Queue preview (tiered)
   - Upcoming questions list (visible to authenticated users)
   - Tiered visibility: free sees 3 days ahead, premium sees 30
   - RLS policy filters by plan tier

9. Social sharing
   - OG meta tags (generateMetadata)
   - Share button (copy URL to clipboard)
   - Optional: Dynamic OG images via ImageResponse

10. Expert dashboard
    - /dashboard: my answers, monthly usage, answer history
    - Calendar view of answered questions

11. Admin enhancements
    - Question queue reordering (drag-and-drop or date picker)
    - Multi-editor support (multiple admin users)
    - Basic analytics (answers per question, expert activity)
```

**Checkpoint:** Full beta-ready platform. Queue preview creates strategic tension. Sharing works on social platforms.

### Phase 4: Polish (Pre-Launch)

```
12. Responsive design pass
13. Error handling + loading states (Suspense boundaries)
14. Rate limiting (Vercel Edge middleware or Supabase)
15. Email notifications (optional for beta)
16. Analytics integration (Vercel Analytics or similar)
```

### Dependency Graph

```
[1. Setup] ─────────────► [2. Schema + RLS] ──► [4. Admin Questions]
                                  │                      │
                                  ▼                      ▼
                          [3. Auth] ──────► [6. Answer Submission]
                                                         │
                              ┌───────────────────┬──────┘
                              ▼                   ▼
                    [5. Public Feed]      [7. Expert Profile]
                              │                   │
                              ▼                   ▼
                    [9. Social Sharing]   [10. Dashboard]
                                                  │
                              ┌────────────────────┘
                              ▼
                    [8. Queue Preview (tiered)]
                              │
                              ▼
                    [11. Admin Enhancements]
```

Key dependencies:
- Schema before anything else
- Auth before answer submission
- Admin question creation before public feed (need content to display)
- Public feed before social sharing (need pages to share)
- Answer submission before dashboard (need answers to display)
- Queue preview depends on both auth (tiering) and question queue (content)

---

## 8. Database Schema Overview

```sql
-- Core tables
profiles (id, handle, display_name, bio, avatar_url, role, plan, answer_limit, created_at)
questions (id, body, slug, category, publish_date, status, created_by, created_at, updated_at)
answers (id, expert_id, question_id, body, created_at, updated_at)

-- Indexes
CREATE UNIQUE INDEX idx_answers_expert_question ON answers (expert_id, question_id);
CREATE INDEX idx_questions_publish_date ON questions (publish_date DESC);
CREATE INDEX idx_questions_status ON questions (status);
CREATE INDEX idx_answers_expert ON answers (expert_id);
CREATE INDEX idx_answers_question ON answers (question_id);
CREATE INDEX idx_answers_created_month ON answers (expert_id, created_at);

-- Constraints
- One answer per expert per question (unique index)
- Answer limit enforced by RLS + Postgres function
- Question slugs are unique
- Expert handles are unique
```

---

## 9. Key Technical Decisions Summary

| Decision | Recommendation | Rationale |
|---|---|---|
| Question publishing | Publish-date column + query filter, no cron | Simplest possible; no moving parts for beta |
| Answer limit enforcement | Three layers: client UX + API route + RLS | Scarcity is the product; enforcement must be bulletproof |
| Race condition prevention | Postgres advisory lock in `submit_answer()` function | Eliminates concurrent submission bugs without external infrastructure |
| Admin routing | Route group `(admin)` + middleware + layout auth check | No separate app; belt-and-suspenders auth |
| Server vs Client Components | Server by default, Client only for interactivity | Maximizes SEO and performance for a content platform |
| Monthly reset | No reset job; query filters by `date_trunc('month', now())` | Eliminates an entire class of scheduled-job bugs |
| Timezone | Store publish_date as DATE, display with `Intl.DateTimeFormat` | Calendar dates are timezone-agnostic |
| Feed caching | ISR with on-demand revalidation when answers are submitted | Fresh enough for beta without real-time complexity |

---

**Document Version:** 1.0
**Last Updated:** 2026-02-25
