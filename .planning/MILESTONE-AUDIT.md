# Milestone Audit: Ethos v1

**Date:** 2026-02-25
**Milestone:** v1 beta launch (38 requirements, 5 phases)

## Requirements Coverage

Source: `.planning/UAT.md` (code-level verification)

| Category | Total | PASS | FAIL | MANUAL |
|----------|-------|------|------|--------|
| AUTH     | 5     | 5    | 0    | 0      |
| PROF     | 5     | 5    | 0    | 0      |
| QUES     | 4     | 4    | 0    | 0      |
| ANS      | 8     | 8    | 0    | 0      |
| FEED     | 5     | 5    | 0    | 0      |
| ADMN     | 6     | 6    | 0    | 0      |
| INFR     | 5     | 4    | 0    | 1      |
| **Total**| **38**| **37**| **0**| **1** |

**Manual:** INFR-01 (Vercel deployment) — requires live deploy to verify.

## Cross-Phase Integration Check

18 integration points verified by reading actual code:

| # | Integration Point | Result | Evidence |
|---|-------------------|--------|----------|
| 1 | Auth → Profile cascade | PASS | `handle_new_user()` trigger (00001:76-119) creates profile with id, handle, display_name, avatar_url. Phase 3 fields (headline, organization) added as nullable columns in 00004. |
| 2 | Auth → Middleware → Admin | PASS | `middleware.js` delegates to `lib/supabase/middleware.js:31-53` — redirects unauthenticated from /admin,/dashboard to /login, checks `profile.role === 'admin'` for admin routes. `admin/layout.jsx:9-17` double-checks server-side. Two-layer enforcement. |
| 3 | Auth → Answer submission | PASS | `actions/answers.js:8` calls `supabase.auth.getUser()`, passes `user.id` as `p_expert_id` to `submit_answer()` RPC (00003). DB function uses `SECURITY DEFINER` with advisory lock. |
| 4 | Profile → Expert page | PASS | `/expert/[handle]/page.jsx:52` queries `profiles.select('*')` — gets all fields including Phase 3 additions (headline, organization, bio, linkedin_url). |
| 5 | Profile → AnswerCard | PASS | Homepage and `/q/[slug]` join profiles with `display_name, handle, avatar_url, answer_limit`. `AnswerCard.jsx:11-33` renders all four fields plus "chose to answer" signal. |
| 6 | Questions → Homepage | PASS | `page.jsx:13-19` queries `.lte('publish_date', today).in('status', ['scheduled', 'published']).order('publish_date', { ascending: false }).limit(1)`. Graceful fallback if no question. |
| 7 | Questions → Answer form | PASS | `/q/[slug]/page.jsx:118` passes `questionId` to `AnswerForm`. `actions/answers.js:14` reads `formData.get('questionId')` and passes to RPC at line 54. |
| 8 | Answers → Budget enforcement | PASS | Three layers verified: (1) AnswerForm disables when `budgetUsed >= budgetLimit`, (2) `submitAnswer` action checks count at line 49, (3) `submit_answer()` DB function uses `pg_advisory_xact_lock` + count at 00003:32-51. |
| 9 | Answers → RLS visibility | PASS | 00005 drops `"Answers are publicly readable"` (USING true), creates `"Visible answers are publicly readable"` with `USING (hidden_at IS NULL)`. Expert UPDATE tightened with `hidden_at IS NULL` guard. Admin gets separate read-all policy. |
| 10 | Admin questions → Public feed | PASS | `createQuestion` action creates with status draft/scheduled. Homepage queries `publish_date <= today AND status IN ('scheduled', 'published')`. Questions appear automatically when date arrives. |
| 11 | Admin moderation → Public feeds | PASS | `toggleAnswerVisibility` sets/clears `hidden_at`. RLS filters `hidden_at IS NULL` for all public reads — applies to `/q/[slug]`, `/expert/[handle]`, homepage, `/answers/[id]`. Revalidation covers all affected paths. |
| 12 | OG images → Content pages | PASS | All three `generateMetadata` functions construct `/api/og?type=...&title=...&subtitle=...&detail=...` URLs. `/api/og/route.jsx` generates 1200x630 images on edge runtime. |
| 13 | Account deletion → Cascade | PASS | `deleteAccount` (actions/profile.js:84-110) uses admin client (service role key) to call `admin.auth.admin.deleteUser()`. FK chain: auth.users → profiles (CASCADE) → answers (CASCADE). 00006 changes questions.created_by to ON DELETE SET NULL. |
| 14 | Footer → All pages | PASS | `Footer` imported and rendered in `layout.jsx:37` after `<main>`. Links to `/privacy` and `/terms`. |
| 15 | Middleware → Protected routes | PASS | `lib/supabase/middleware.js:31-38` redirects unauthenticated users from /admin and /dashboard to /login. Lines 41-53 check admin role for /admin routes. |
| 16 | Title template → All pages | PASS | Root layout has `title: { template: '%s — Ethos' }`. Grep confirms no child pages contain "— Ethos" in title strings. No double-suffix. |
| 17 | ShareButton → Content pages | PASS | `/q/[slug]/page.jsx:7,138` imports and renders `ShareButton`. `/answers/[id]/page.jsx:6,117` imports and renders `ShareButton`. |
| 18 | metadataBase → OG resolution | PASS | Root layout line 14: `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')`. Relative OG image paths resolve correctly. |

**Integration result: 18/18 PASS. No cross-phase wiring issues.**

## Migration Chain

All 6 migrations form a clean dependency chain:

| Migration | Purpose | Phase |
|-----------|---------|-------|
| 00001_initial_schema.sql | Tables, indexes, triggers | 1 |
| 00002_rls_policies.sql | RLS on all 3 tables | 1 |
| 00003_submit_answer_function.sql | Advisory lock budget enforcement | 2 |
| 00004_profile_fields.sql | headline, organization columns | 3 |
| 00005_answer_moderation.sql | hidden_at/hidden_by, updated RLS | 4 |
| 00006_created_by_set_null.sql | Fix questions.created_by FK cascade | 5 |

No migration conflicts. Each migration is additive or safely alters existing structures.

## Tech Debt & Observations

| Item | Severity | Notes |
|------|----------|-------|
| REQUIREMENTS.md traceability still shows "Pending" | Cosmetic | Never updated after implementation — all requirements are implemented |
| No Markdown preview in AnswerForm | Low | Answers render Markdown correctly after submission; just no live preview while typing |
| Admin middleware check adds DB query per request | Low | Fine for beta scale. Consider caching role in JWT claims later. |
| No error boundary components | Low | Server errors show Next.js default. Add custom error.jsx pages post-launch if needed. |
| No rate limiting on Server Actions | Low | Supabase handles connection limits. Consider edge rate limiting at Vercel level for prod scale. |

None of these are blockers for beta launch.

## Pre-Launch Checklist

| Step | Status |
|------|--------|
| Code-level verification (38 requirements) | Done — 37 PASS, 1 MANUAL |
| Cross-phase integration audit (18 points) | Done — 18/18 PASS |
| `npm run build` passes | Done |
| Configure Google OAuth (Google Console) | Pending |
| Configure LinkedIn OIDC (LinkedIn Dev Portal) | Pending |
| Configure providers in Supabase Dashboard | Pending |
| Deploy to Vercel | Pending |
| Set NEXT_PUBLIC_SITE_URL env var | Pending |
| Run Supabase migrations (00001–00006) | Pending |
| Promote initial admin user (`UPDATE profiles SET role = 'admin'`) | Pending |
| Smoke test: sign in → answer → verify on profile | Pending |

## Verdict

**v1 milestone is complete.** All code-verifiable requirements pass. All cross-phase integrations are correctly wired. No blocking tech debt. Ready for beta launch pending deployment and OAuth configuration.
