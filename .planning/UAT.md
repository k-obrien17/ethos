# UAT: Ethos v1 — Full Verification

**Date:** 2026-02-25
**Scope:** All 5 phases, 38 v1 requirements
**Method:** Code-level audit (no local Supabase/Docker available)

## Results Summary

| Category | PASS | FAIL | MANUAL |
|----------|------|------|--------|
| AUTH (5) | 5 | 0 | 0 |
| PROF (5) | 5 | 0 | 0 |
| QUES (4) | 4 | 0 | 0 |
| ANS (8) | 8 | 0 | 0 |
| FEED (5) | 5 | 0 | 0 |
| ADMN (6) | 6 | 0 | 0 |
| INFR (5) | 4 | 0 | 1 |
| **Total** | **37** | **0** | **1** |

## Detailed Results

### Authentication (Phase 1)

| Req | Description | Result | Evidence |
|-----|-------------|--------|----------|
| AUTH-01 | LinkedIn OIDC sign-in | PASS | login/page.jsx: `signInWithOAuth({ provider: 'linkedin_oidc' })` + callback route |
| AUTH-02 | Google OAuth sign-in | PASS | login/page.jsx: `signInWithOAuth({ provider: 'google' })` + callback route |
| AUTH-03 | Session persistence | PASS | @supabase/ssr cookie-based session in middleware + server client |
| AUTH-04 | Protected route redirects | PASS | Middleware redirects /admin, /dashboard to /login when unauthenticated |
| AUTH-05 | Admin role enforcement | PASS | Two layers: middleware fast-reject + admin layout server-side check |

### Profiles (Phases 1, 3)

| Req | Description | Result | Evidence |
|-----|-------------|--------|----------|
| PROF-01 | Auto-created on signup | PASS | handle_new_user() trigger in 00001_initial_schema.sql |
| PROF-02 | Edit headline/bio/org | PASS | updateProfile action + EditProfileForm with 5 editable fields |
| PROF-03 | Public profile + archive | PASS | /expert/[handle] page with full answer history |
| PROF-04 | Monthly count + selectivity | PASS | Stats grid: total answers, monthly count, selectivity % |
| PROF-05 | Shareable URL | PASS | /expert/[handle] route with generateMetadata + OG tags |

### Questions (Phase 2)

| Req | Description | Result | Evidence |
|-----|-------------|--------|----------|
| QUES-01 | Daily question via publish_date | PASS | Homepage queries latest published question, no cron needed |
| QUES-02 | Past questions browsable | PASS | /questions archive page, chronological, with answer counts |
| QUES-03 | Answer count displayed | PASS | select('*, answers(count)') on questions page + homepage |
| QUES-04 | Shareable URL with OG | PASS | /q/[slug] with full openGraph + twitter + og:image |

### Answers (Phase 2)

| Req | Description | Result | Evidence |
|-----|-------------|--------|----------|
| ANS-01 | Submit answer | PASS | AnswerForm + submitAnswer action + submit_answer() RPC |
| ANS-02 | Three-layer enforcement | PASS | Client UX disable → Server Action count → DB advisory lock |
| ANS-03 | Budget display | PASS | BudgetIndicator in Header + AnswerForm |
| ANS-04 | Draft auto-save | PASS | localStorage per questionId, 500ms debounce, restore on mount |
| ANS-05 | Shareable /answers/[id] | PASS | Route with generateMetadata + OG + og:image |
| ANS-06 | Markdown rendering | PASS | react-markdown in AnswerCard + expert profile answer list |
| ANS-07 | 3/month calendar reset | PASS | submit_answer() uses date_trunc('month', now()), default limit 3 |
| ANS-08 | "X chose to answer" | PASS | AnswerCard: "{name} chose to answer" + monthly usage context |

### Feeds (Phases 2, 3)

| Req | Description | Result | Evidence |
|-----|-------------|--------|----------|
| FEED-01 | Browse by question | PASS | /q/[slug] shows all expert answers under the question |
| FEED-02 | Browse by person | PASS | /expert/[handle] shows full answer history with question context |
| FEED-03 | Homepage today's question | PASS | Homepage renders latest question + its answers |
| FEED-04 | Public without auth | PASS | RLS: public SELECT on profiles, published questions, visible answers |
| FEED-05 | OG meta + social cards | PASS | /api/og edge route + full openGraph on questions, answers, profiles |

### Admin (Phase 4)

| Req | Description | Result | Evidence |
|-----|-------------|--------|----------|
| ADMN-01 | Create questions | PASS | createQuestion action + QuestionForm + /admin/questions/new page |
| ADMN-02 | Reorder queue | PASS | rescheduleQuestion action + inline RescheduleForm |
| ADMN-03 | Edit/delete unpublished | PASS | updateQuestion + deleteQuestion (blocks published deletion) |
| ADMN-04 | Multi-editor | PASS | Role-based only (profiles.role = 'admin'), no user-specific gates |
| ADMN-05 | Hide/flag answers | PASS | toggleAnswerVisibility + hidden_at/hidden_by + tightened RLS |
| ADMN-06 | Queue dashboard | PASS | Stats, depth indicator, gap detection, upcoming queue, draft list |

### Infrastructure (Phases 1, 5)

| Req | Description | Result | Evidence |
|-----|-------------|--------|----------|
| INFR-01 | Deployed on Vercel | MANUAL | .vercel/ exists, standard Next.js config — needs live verification |
| INFR-02 | RLS on all tables | PASS | ENABLE ROW LEVEL SECURITY on profiles, questions, answers (100%) |
| INFR-03 | Mobile responsive | PASS | Viewport meta, responsive grids (grid-cols-1 sm:grid-cols-3), max-w-2xl container |
| INFR-04 | Account deletion | PASS | deleteAccount action via admin client, cascade through auth→profiles→answers |
| INFR-05 | Privacy/terms | PASS | /privacy + /terms pages with Footer links on every page |

## Manual Testing Required

1. **INFR-01**: Deploy to Vercel and verify:
   - Production build works on Vercel
   - Preview deployments generate on PR branches
   - Environment variables configured correctly

2. **OAuth providers**: Requires manual setup:
   - Google Console: OAuth client credentials
   - LinkedIn Dev Portal: OpenID Connect app
   - Supabase Dashboard: Provider configuration

3. **End-to-end flows** (once deployed with Supabase):
   - Sign in → answer question → verify budget decrement → view on profile
   - Admin creates question → appears on homepage at publish_date
   - Admin hides answer → no longer visible in public feeds
   - User deletes account → profile and answers removed

## Observations (Non-Blocking)

1. **URL naming**: Requirements say `/questions/[id]` but implementation uses `/q/[slug]` — better URL design, meets the intent
2. **No Markdown preview in AnswerForm**: Roadmap mentions "textarea with Markdown preview" but the form has no live preview. Answers do render Markdown correctly after submission.
3. **Homepage graceful degradation**: Shows most recent question if no question exists for today — good UX for weekends/gaps

## Verdict

**37 of 38 requirements PASS code-level verification. 0 failures. 1 manual (deployment).**

The codebase is ready for beta launch pending:
- OAuth provider configuration
- Vercel deployment
- Production Supabase migrations
- Initial admin user promotion
