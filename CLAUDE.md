# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Public Q&A platform where vetted experts answer one curated question per day with a limited monthly budget (3 answers/month). The scarcity constraint makes each answer a deliberate signal of expertise. Invite-only beta. Password-gated.

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database:** Supabase (Postgres + Auth + RLS + RPCs)
- **Styling:** Tailwind CSS 4 via `@tailwindcss/postcss`
- **Email:** Resend with Vercel Cron (`/api/cron/daily-emails`)
- **Analytics:** Vercel Analytics + Speed Insights + custom admin dashboard
- **Monitoring:** Structured logger → `error_logs` table, `/api/health`, BetterStack uptime
- **LLM:** Anthropic SDK for AI detection (`claude-haiku-4-5`) and answer enrichment (`claude-sonnet-4-5`)
- **Deploy:** Vercel + GitHub Actions CI (lint + build)
- **Language:** JavaScript (JSX), no TypeScript

## Commands

```bash
npm run dev     # Next.js dev server (localhost:3000)
npm run build   # Production build
npm run lint    # ESLint (must pass for CI)
npm run start   # Production server
```

## Architecture

### Data Flow

Server Components fetch from Supabase → render HTML. Client Components use Server Actions for mutations. No client-side Supabase queries except auth.

```
Browser → Server Component (data fetch) → Supabase
Browser → Server Action (mutation) → Supabase → revalidatePath
```

### Auth Flow

Supabase Auth with Google + LinkedIn OAuth. Middleware (`src/middleware.js`) handles:
1. Static asset bypass (`/_next/`, favicons, images)
2. Admin route protection (role check on `/admin/*`)
3. Dashboard route protection (auth check on `/dashboard/*`)

Pre-launch, the entire site is gated by `SITE_PASSWORD` via `/password` (middleware checks `site_access=granted` cookie, 30-day expiry). Submission is additionally gated by auth in the `submitAnswer` server action. Account creation requires an invite code on `/login`. Remove the gate at launch by unsetting `SITE_PASSWORD` in Vercel.

Server Components get user via `createClient()` → `supabase.auth.getUser()`.
Admin operations use `createAdminClient()` (service role key, bypasses RLS).

### Answer Submission Pipeline

```
submitAnswer() in src/app/actions/answers.js:
  1. Auth check
  2. Rate limit (10/hour)
  3. Profile status check (reject suspended/pending)
  4. Email verification check
  5. Server-side budget check (fast reject)
  6. Answer cap + deadline check (per-question scarcity)
  7. AI detection (Anthropic Haiku, 5s timeout, fails open with per-user tracking)
  8. submit_answer RPC (advisory lock + budget enforcement + insert)
  9. Revalidate paths
  10. Fire-and-forget: enrichAnswer() → decompose into claims/frameworks/evidence
  11. Fire-and-forget: notify followers
```

### Knowledge Graph (LLM Enrichment)

Every answer is automatically decomposed by `src/lib/enrichment.js`:
- `claims` table — atomic falsifiable assertions with type, domain, confidence
- `frameworks` table — reusable mental models with components
- `evidence` table — supporting observations linked to claims
- `expertise_edges` table — weighted expert-topic links
- `enrichment_runs` + `change_records` — full audit trail

Enrichment runs on submit (inline, fire-and-forget) and via batch script (`scripts/enrich-content.mjs`).

### Caching Strategy

- ISR: legal pages (daily), leaderboard (hourly)
- `unstable_cache`: topics list, site settings (300s) in `src/lib/supabase/cached.js`
- Suspense: 11 `loading.jsx` skeleton files for streaming
- Static assets: immutable Cache-Control via `next.config.mjs` headers

## Key Patterns

- **Fire-and-forget with error logging:** Notifications, enrichment, and view tracking use `.then(() => {}).catch(err => console.error(...))` — never block the user response.
- **Optimistic updates with server sync:** LikeButton uses `useOptimistic` then reconciles with actual server count on response.
- **Denormalized counts:** `like_count`, `comment_count`, `view_count` on answers; `follower_count`, `following_count` on profiles. Updated via RPCs (`increment_*`, `decrement_*`).
- **RLS + admin client:** Public reads use anon key (RLS enforced). Admin operations (enrichment, cron, monitoring) use service role key.
- **Supabase FK joins:** Use `profiles:expert_id(...)` syntax when table has multiple FKs to same target (answers → profiles has expert_id, hidden_by, featured_by).

## Database

29+ migrations in `supabase/migrations/`. Key tables:

**Core:** profiles, questions, answers, topics, question_topics
**Social:** follows, answer_likes, answer_comments, bookmarks, topic_follows
**Notifications:** notifications (6 types: like, comment, featured, follow, comment_reply, followed_expert_posted)
**Knowledge graph:** claims, frameworks, evidence, claim_relations, expertise_edges, answer_tags, content_summaries
**Operations:** enrichment_runs, change_records, content_reviews, error_logs, rate_limits, site_settings
**Auth:** invites, api_keys, answer_drafts, reports

Migrations are applied manually via Supabase SQL Editor. See `docs/MIGRATIONS.md` for workflow.

## Environment Variables

Required in `.env.local` (never committed):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SITE_PASSWORD
ANTHROPIC_API_KEY
```

Optional:
```
NEXT_PUBLIC_SITE_URL    # defaults to http://localhost:3000
RESEND_API_KEY          # for email
SENDER_EMAIL            # from address
CRON_SECRET             # Vercel cron auth
```

## Conventions

- No TypeScript — plain JS/JSX throughout
- Server Actions in `src/app/actions/` — one file per domain (answers, comments, likes, etc.)
- Admin pages in `src/app/admin/` — protected by layout role check
- Public API in `src/app/api/v1/` — requires API key via `src/lib/apiAuth.js`
- All user input validated server-side (trim, length limits, regex patterns)
- Supabase queries are always parameterized (no raw SQL in app code)
- `escapeHtml()` used in email templates and HTML responses; `sanitizeSnippet()` in search results
- `JSON.stringify()` for user content in LLM prompts (not string interpolation)
- `timingSafeEqual` for all secret comparisons (cron secret, site password)
- In-memory Maps (`rateLimit.js`, `aiDetection.js`) have bounded eviction to prevent memory leaks
- Security headers configured in `next.config.mjs` (X-Frame-Options, CSP, etc.)
- Invite codes use `crypto.randomBytes`, cron secret uses `crypto.timingSafeEqual`

## Design System

- Neutral gray palette mapped to `warm-50` through `warm-900`
- Blue accent: `accent-500` (#3b82f6), `accent-600` (#2563eb), `accent-700` (#1d4ed8)
- Inter font via `next/font/google`
- `max-w-2xl` content width, `px-4` horizontal padding
- Cards: white bg, `border-warm-200`, `rounded-lg` or `rounded-md`
- Buttons: `bg-accent-600 text-white rounded-md` (primary), `bg-warm-100 text-warm-600` (secondary)
- Toast notifications via Sonner (`position="bottom-right" richColors`)
- Loading skeletons use `animate-pulse bg-warm-200 rounded`
- Error boundaries: `error.jsx` per route with retry + home link

## Key Pages

- `/` — Homepage: today's question + answers, trending, featured expert, companies on Credo, recent questions
- `/q/[slug]` — Question page with answer form (enforces cap, deadline, budget)
- `/experts` — Expert directory with sort (answers, active, engagement, recent, likes) and topic filter
- `/expert/[handle]` — Expert profile with answers, expertise tags, follow button
- `/for-companies` — Company recruitment landing page (LLM data value proposition)
- `/join` — Individual expert recruitment page
- `/leaderboard` — Sortable expert rankings (likes, answers, views)
- `/dashboard` — Expert dashboard: stats, answer performance, bookmarks, invites, profile edit
- `/admin/*` — Admin panel: questions, experts (approval workflow), answers, analytics, monitoring, invites

## CI/CD

- GitHub Actions: `.github/workflows/ci.yml` — lint + build on every push/PR
- Branch protection on `main` — requires `lint-and-build` check
- Vercel preview deploys on PRs
- CI uses placeholder Supabase env vars (build-only, no runtime queries)
- `sitemap.js` has `export const dynamic = 'force-dynamic'` to prevent build-time DB queries
