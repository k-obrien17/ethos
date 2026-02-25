# Research Summary

**Date:** 2026-02-25
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Stack Recommendation

**Next.js 15** (App Router, RSC, Server Actions) + **Supabase** (Postgres, Auth, RLS) + **Vercel** + **Tailwind CSS v4**. All HIGH confidence except Tailwind v4 (MEDIUM-HIGH — new engine, verify OG image compat).

**11 production deps, 5 dev deps.** Core: `@supabase/supabase-js` ~2.45+, `@supabase/ssr` ~0.5+, `date-fns` ~4.1+, `react-markdown` ~9.0+, `zod` ~3.23+, `@vercel/og` ~0.6+, `@vercel/analytics` ~1.4+.

**Deliberately excluded:** Prisma/Drizzle (Supabase client sufficient), NextAuth (conflicts with Supabase Auth), Redux/Zustand (no complex client state), shadcn/ui (hand-built components faster to iterate for solo operator), rich text editors (plain textarea + Markdown rendering).

**Forms:** React 19 `useActionState` + Server Actions. No react-hook-form needed.

See STACK.md §6-7 for the full exclusion list and dependency table.

---

## Architecture Patterns

**Server/Client boundary:** Pages and layouts are Server Components. Interactive elements (answer form, share button, auth state, admin editors) are Client Components in separate `'use client'` files. Push the boundary as deep as possible — fetch in Server Components, pass props to Client Components.

**Three route groups:** `(public)` for feeds/profiles, `(auth)` for expert dashboard/answer submission, `(admin)` for question management. Each group has its own layout with appropriate auth enforcement. Middleware handles session refresh and fast redirect; layouts do server-side auth checks. Belt and suspenders.

**Question scheduling:** No cron job. `publish_date` column + query-time filtering (`WHERE publish_date <= CURRENT_DATE`). A question becomes visible when its date arrives. Admin reorders by changing dates. See ARCHITECTURE.md §3.

**Answer limit enforcement — three layers:**
1. Client-side UX (budget display, disable form)
2. Server Action / API route (count check before insert)
3. Database RLS policy + Postgres advisory lock function (absolute backstop, race-condition-proof)

**Caching:** ISR with on-demand revalidation. Public feeds use `revalidate: 60` or `revalidate: 3600`. Admin panel uses `force-dynamic`. `revalidatePath()` after every answer submission. No Supabase Realtime — unnecessary for daily cadence.

**Data flow:** Admin creates question (INSERT with publish_date) -> User visits on that date (Server Component SELECT) -> Expert submits answer (Server Action -> advisory-locked Postgres function) -> `revalidatePath` refreshes feed.

See ARCHITECTURE.md §1-5 for full component mapping and SQL patterns.

---

## Feature Priority

### Must Build (Beta Launch)

1. Social login (LinkedIn OIDC + Google OAuth)
2. Expert profiles (name, photo, headline, bio — user-entered, not LinkedIn-enriched)
3. Daily question display + past questions archive
4. Answer submission with visible budget tracking ("2 of 3 remaining")
5. Browse by question (all answers) + browse by person (answer archive)
6. Shareable answer links + OG meta tags
7. Admin: question CRUD, scheduling, multi-editor support (2-5 editors)
8. Draft auto-save
9. Mobile-responsive design

### Should Build (Early Iteration)

10. Tiered queue preview (free: 3 days, premium: 30 days)
11. "X chose to answer" signal on answer cards
12. Monthly answer count + selectivity ratio on profiles
13. No-edit-after-publish (or 15-min window)
14. "Featured answer" editorial pick per question
15. Topic/category tagging on questions

### Could Build (Post-Validation)

16. Premium tier billing (Stripe)
17. Expert analytics (view counts, reach)
18. Calendar view of upcoming questions
19. Embeddable answer widgets
20. Monthly/yearly answer recap

### Never Build

- Comments/replies on answers (kills expert participation — Quora's failure mode)
- Public reactions/upvotes (creates popularity contest, undermines selectivity signal)
- Algorithmic feed (chronological + editorial only)
- AI answer suggestions (undermines authenticity premise)
- Follower counts / social graph (wrong signal for this product)
- Gamification (points, badges, leaderboards)

See FEATURES.md §1-4 for full matrix with complexity estimates and dependency chains.

---

## Critical Risks

**1. Cold start / empty feed.** No answers = no readers = no experts. Mitigation: Seed 2-3 weeks of content from 10-15 recruited experts before opening to readers. Stagger launch — experts first, readers second. (PITFALLS.md §2.1-2.2)

**2. Scarcity kills engagement.** 3 answers/month means experts can go 10+ days without engaging, break the habit loop, and churn. Mitigation: The read experience (browsing others' answers) must be compelling standalone. Track visits-without-answering as a health metric. Consider bookmarking as a zero-cost engagement action. (PITFALLS.md §1.1)

**3. Supabase free tier auto-pause.** Database sleeps after 7 days of inactivity — kills beta momentum if users hit a sleeping DB. Mitigation: Health-check cron or upgrade to Pro ($25/month) once beta is active. (PITFALLS.md §4.3)

**4. LinkedIn OAuth scope limits.** OpenID Connect only gives name, photo, email. No headline, company, or industry data. Mitigation: Design onboarding to collect professional details from the user. Do not build features that depend on LinkedIn profile enrichment. (PITFALLS.md §3.2)

**5. Next.js caching shows stale content.** Default caching can serve yesterday's question or hide new answers. Mitigation: Define caching strategy per route before building. Use on-demand revalidation after every mutation. (PITFALLS.md §5.2)

**6. Question quality determines platform ceiling.** Generic questions produce generic answers. Mitigation: Build 60-90 question backlog before launch. Track answer rate per question to identify what works. Multi-editor review process. (PITFALLS.md §2.3)

**7. Solo operator overhead is people, not code.** Expert relationship management (profile edits, answer questions, special requests) will dominate time. Mitigation: Build self-service for every common operation. FAQ before it's needed. Set expectations in onboarding. (PITFALLS.md §7.3)

---

## Key Insights

1. **The scarcity mechanic IS the credibility signal.** "This person had 3 answers and chose THIS question" is more powerful than any badge or follower count. The profile should surface selectivity patterns, not vanity metrics.

2. **No cron needed for publishing.** Query-time filtering on `publish_date` is simpler and more reliable than state-mutation cron jobs. A question becomes live the moment its calendar date arrives.

3. **Race conditions on answer limits are a real threat.** Two simultaneous submissions can both pass count checks. The Postgres advisory lock function (`submit_answer()`) is not optional — it's the only reliable enforcement for the core mechanic.

4. **Social sharing is the growth engine, not a nice-to-have.** The loop is: expert answers -> shares on LinkedIn -> connection clicks -> discovers platform -> signs up. OG tags and shareable links are infrastructure, not features.

5. **The read experience must justify visits even when experts aren't answering.** With 3 answers/month, experts visit ~3 times to write. If they don't visit to read, the platform has no daily habit. Browse-by-question and browse-by-person are retention features, not discovery features.

6. **LinkedIn development mode caps at ~20 test users.** For a 20-50 user beta, you may need Production mode, which requires company page verification and review. Apply early. Google OAuth is the fallback.

7. **Calendar month reset creates engagement cliffs.** Answer volume spikes at month-end, drops mid-month. A rolling window (each answer unlocks N days after use) is better but harder to build. Ship calendar month first, measure, and decide.

---

## Open Questions

| Question | Impact | When to Decide |
|----------|--------|----------------|
| Calendar month vs. rolling window for answer budget | Core mechanic behavior — affects engagement curves | Before building answer-budget system |
| LinkedIn app: Development mode (20 users) vs. Production (requires review) | Blocks beta scale beyond 20 users | Apply for Production in week 1 |
| 3 free / 5 premium answer limits — are these right? | Core product feel — too tight kills engagement, too loose kills signal | Ship 3/5 for beta, instrument and measure utilization |
| Hide other answers until expert submits their own? | Prevents anchoring but reduces read engagement | UX decision during answer submission build |
| Supabase free tier vs. Pro ($25/month) for beta | Auto-pause risk vs. cost | Upgrade when 10+ regular users |
| Soft word guidance (100-500) vs. hard min/max on answers | Prevents throwaway answers but adds friction | During answer form build |
| Image uploads for expert avatars vs. OAuth-provided only | Affects profile quality and storage needs | During profile implementation |

See individual research documents for full context on each question.

---

*This is a decision document. For implementation details, reference the source files directly.*
