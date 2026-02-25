# Ethos Platform Pitfalls Research

**Analysis Date:** 2026-02-25
**Project:** Ethos — curated content platform with scarcity mechanics
**Stack:** Next.js (App Router) + Supabase + Vercel + Tailwind CSS
**Source:** Architecture analysis + known failure patterns from similar platforms

---

## Table of Contents

1. [Scarcity Mechanic Pitfalls](#1-scarcity-mechanic-pitfalls)
2. [Cold Start Problems](#2-cold-start-problems)
3. [LinkedIn OAuth Pitfalls](#3-linkedin-oauth-pitfalls)
4. [Supabase-Specific Gotchas](#4-supabase-specific-gotchas)
5. [Next.js App Router Common Mistakes](#5-nextjs-app-router-common-mistakes)
6. [Platform-Killing Mistakes](#6-platform-killing-mistakes)
7. [Solo Operator Overhead Surprises](#7-solo-operator-overhead-surprises)
8. [Phase Mapping](#8-phase-mapping)

---

## 1. Scarcity Mechanic Pitfalls

### 1.1 Too Restrictive Kills Engagement

**The problem:** 3 answers/month means an expert can go 10+ days without engaging. During that silence they forget the platform exists, break the habit loop, and never come back. The platform trains them to NOT visit.

**Warning signs:**
- Monthly active users drops while registered users grows (sign-ups but no stickiness)
- Most experts use 0-1 of their 3 answers per month
- Login frequency drops to 1-2x/month (only when they want to answer)
- Experts say "I keep forgetting about it"

**Prevention strategy:**
- Give experts a reason to visit even when they are not answering. Read-only engagement (browsing others' answers, seeing who answered what) must be compelling on its own.
- Consider a "save for later" or "bookmark" action that costs nothing but creates a visit reason.
- Send a lightweight notification when a question in their domain goes live — brings them back to evaluate whether to spend an answer.
- Track "visits without answering" as a health metric. If it drops below 2:1 (visits:answers), the read experience is not sticky enough.

**Phase:** Address in Phase 1 (beta). The read experience must be engaging before launch or scarcity kills the platform before you can test it.

### 1.2 Too Generous Removes Value

**The problem:** If experts can answer 10+/month, there is no selectivity signal. Every answer becomes noise. The platform collapses into another Quora where prolific answerers dominate.

**Warning signs:**
- Most experts exhaust their budget early in the month
- Answer quality drops toward end of budget (using remaining answers on questions they care less about)
- Readers cannot distinguish "this expert chose this question deliberately" from "they answered everything"

**Prevention strategy:**
- Start at 3 free / 5 premium and measure. The right number is where experts regularly have to skip questions they want to answer.
- Track "answer budget utilization" — if 80%+ of experts use all answers, the cap is too high. Sweet spot is 50-70% utilization (some months they skip, some they use all).
- Never let unused answers roll over. Rollover destroys scarcity ("I have 12 saved up, I'll answer anything").

**Phase:** Phase 1 design decision. Validate with beta cohort. Be prepared to adjust in Phase 2 based on data.

### 1.3 The Reset Cliff

**The problem:** Monthly reset creates a cliff. Experts who used all answers by the 15th disengage for 2 weeks. Experts who hoarded answers rush to use them on the 28th-31st, creating uneven content quality.

**Warning signs:**
- Answer volume spikes in last 3 days of month
- Answer volume drops to near-zero mid-month
- Answer quality (word count, depth) is lower on month-end answers

**Prevention strategy:**
- Consider a rolling window instead of calendar month (each answer unlocks 10 days after use — always 3 available on a rolling basis). More complex to implement but smoother engagement.
- If sticking with calendar month, show "X answers remaining" prominently alongside the queue to encourage strategic distribution.
- Consider giving a "bonus answer" for the first month to reduce new-user anxiety about wasting one.

**Phase:** Phase 1 design decision. Rolling window is harder to build but fundamentally better. Calendar month is simpler to ship. Decide before building the answer-budget system.

### 1.4 Scarcity Without Audience Is Meaningless

**The problem:** Scarcity only creates value if someone is reading. If an expert spends their precious answer and nobody sees it, the mechanic feels punitive rather than prestigious. They spent a limited resource and got nothing back.

**Warning signs:**
- Experts ask "how many people saw my answer?"
- Answer quality decreases over time (experts stop putting effort in)
- Experts share links but get no engagement

**Prevention strategy:**
- Show view counts or engagement signals (even if numbers are small in beta) — "12 people read your answer" matters
- Aggregate and surface to experts: "Your answers have been viewed X times this month"
- Premium tier analytics (reach, reads) is a good monetization lever because it addresses this exact anxiety

**Phase:** Phase 2 (post-beta). View counts are easy to implement. Analytics dashboard is premium upsell.

---

## 2. Cold Start Problems

### 2.1 Empty Feed Problem

**The problem:** First visitors see an empty or near-empty feed. A platform built on expert answers with no expert answers is DOA. Even 5-10 experts posting occasionally means most questions have 0-1 answers.

**Warning signs:**
- More than 30% of questions in the last 2 weeks have zero answers
- Visitors bounce within 10 seconds (nothing to read)
- First-time visitors never return

**Prevention strategy:**
- Seed the platform before public launch. Get 10-15 committed experts to answer for 2-3 weeks before opening to readers. This means the editorial team is curating questions AND recruiting answerers simultaneously.
- Stagger the launch: invite experts first (2-3 weeks head start), then open to readers. Never open both doors at the same time.
- Consider allowing the editorial team (Keith + collaborators) to answer questions themselves to fill the feed. Clearly labeled as "editorial perspective" if needed.
- Show "questions answered this week" rather than "total questions" to avoid exposing empty days.

**Phase:** Pre-launch (Phase 1). The first public page must have content. Plan for 2-3 weeks of seeded content before any reader sees the platform.

### 2.2 Expert Recruitment Chicken-and-Egg

**The problem:** Experts will not join a platform nobody reads. Readers will not visit a platform nobody writes on. The standard two-sided marketplace problem.

**Warning signs:**
- Expert invitations get ignored or declined
- Experts sign up but never post
- You cannot articulate why an expert should answer here vs. posting on LinkedIn

**Prevention strategy:**
- Start with your network. As a consultancy operator with ~80 clients, you have a warm audience of potential experts. The first 20-50 experts should come from direct asks, not cold outreach.
- Frame the pitch as "exclusive, curated" not "new platform." The scarcity mechanic IS the pitch: "You only get 3 answers a month. Make them count."
- Give early experts a "founding contributor" badge or status that persists after launch. Status signals attract status-conscious experts.
- Make answers shareable to LinkedIn. Experts who can cross-post their Ethos answers to their existing audience get immediate value from day one.

**Phase:** Pre-launch recruitment. Must happen before Phase 1 beta opens to readers.

### 2.3 Question Quality Sets the Ceiling

**The problem:** If questions are generic ("What makes a good leader?"), expert answers will be generic too. The entire platform's quality depends on question curation. Bad questions waste experts' limited answer budget.

**Warning signs:**
- Experts complain questions are "too broad" or "obvious"
- Answers are interchangeable (any expert could have written any answer)
- Experts stop answering because nothing is worth spending an answer on

**Prevention strategy:**
- Questions should be specific enough to reveal genuine differences in perspective. "What's a leadership lesson you learned the hard way?" is better than "What makes a good leader?"
- Questions should be timely but not ephemeral. "How should B2B companies think about AI adoption in 2026?" has a shelf life. "What's your hot take on today's news?" is throwaway.
- Build a question review process: propose → review → schedule. Even with a small editorial team, having a second pair of eyes prevents lazy questions.
- Track "answer rate per question" — questions that experts skip reveal what does not work.

**Phase:** Phase 1 ongoing. Question curation is an operational process, not a feature to build.

---

## 3. LinkedIn OAuth Pitfalls

### 3.1 API Product Approval Process

**The problem:** LinkedIn's API access is not open. You must apply for API products through the LinkedIn Developer Portal, and the approval process can take days to weeks. The free "Sign In with LinkedIn using OpenID Connect" product gives you basic profile data, but additional scopes (posting, company data, analytics) require separate product approvals with business justification.

**Warning signs:**
- You build against LinkedIn's API docs assuming access, then discover your app is not approved for the scopes you need
- Your approval application is rejected because LinkedIn does not see a qualifying business use case
- You are stuck in "review" status for weeks with no timeline

**Prevention strategy:**
- Apply for LinkedIn API access immediately, before writing any auth code. The "Sign In with LinkedIn using OpenID Connect" product is self-serve and usually auto-approved. Apply for it now.
- For Ethos beta, you only need OpenID Connect (profile, email). Do NOT apply for posting/sharing APIs until you actually need them.
- Supabase Auth supports LinkedIn as a provider, but you must configure it with your own LinkedIn app credentials. Create the LinkedIn app first, get the client ID and secret, then configure Supabase.
- Keep your LinkedIn app in "Development" mode during beta (limited to specific test users you whitelist). "Production" mode requires a company page verification and review.

**Phase:** Phase 1, first week. Create LinkedIn Developer app and apply for OpenID Connect immediately.

### 3.2 Scope Limitations

**The problem:** LinkedIn's OpenID Connect gives you: `openid`, `profile`, `email`. That is it. You get the user's name, profile picture URL, email, and a LinkedIn-specific user ID. You do NOT get: headline, current company, industry, connections, or any profile details beyond the basics.

**Warning signs:**
- You design expert profiles assuming you'll pull headline/company from LinkedIn
- You build a "discover experts by industry" feature assuming LinkedIn profile data
- Expert profiles look empty because you only have name + photo

**Prevention strategy:**
- Design the onboarding flow to collect what LinkedIn will not give you. After OAuth, ask the expert to add: headline, company, industry, bio. Pre-fill name and photo from LinkedIn, but everything else is user-entered.
- Store the LinkedIn profile URL so readers can visit the expert's full profile. This is more valuable than trying to replicate LinkedIn data in your platform.
- Do NOT plan features that depend on LinkedIn profile enrichment. That API requires the "Advertising" or "Marketing" products, which are enterprise-level and will not be approved for a beta platform.

**Phase:** Phase 1 schema design. Build the profiles table with user-entered fields, not LinkedIn-sourced fields.

### 3.3 Token Expiration and Refresh

**The problem:** LinkedIn access tokens expire after 60 days. Refresh tokens (if granted) expire after 365 days. If you rely on LinkedIn tokens for ongoing API calls (not just login), tokens will silently expire and break.

**Warning signs:**
- Users report being logged out unexpectedly
- Background jobs that use LinkedIn tokens start failing after 2 months
- You store tokens but never implement refresh logic

**Prevention strategy:**
- Supabase Auth handles token refresh for the auth flow itself. Once the user is authenticated, Supabase issues its own JWT. You should NOT store or use LinkedIn tokens directly for anything other than the initial login.
- If you later add LinkedIn sharing (posting answers to LinkedIn), you will need to handle token refresh. Build that when you build the sharing feature, not now.
- For beta, treat LinkedIn as an identity provider only. After login, all operations use Supabase JWTs.

**Phase:** Phase 1 for basic auth. Phase 3+ for any LinkedIn API integration beyond login.

### 3.4 Development vs. Production Mode

**The problem:** LinkedIn apps in Development mode only work for users you explicitly add as test users (up to ~20). To allow any LinkedIn user to log in, you must verify your app and move it to Production, which requires a company LinkedIn page and a review process.

**Warning signs:**
- Beta testers cannot log in because they are not on your test user list
- You hit the test user limit during beta expansion
- The production review process takes longer than expected, blocking your launch

**Prevention strategy:**
- For a 20-50 user beta, Development mode might suffice. Add each beta tester as a LinkedIn test user manually.
- If this becomes friction, apply for Production verification early. It requires: a verified LinkedIn company page, a privacy policy URL, and terms of service URL (can be simple pages on your domain).
- Have Google OAuth as a fallback. If LinkedIn verification is delayed, experts can still sign in with Google.

**Phase:** Phase 1 setup. Monitor during beta; apply for Production mode when approaching 20 test users.

---

## 4. Supabase-Specific Gotchas

### 4.1 RLS Performance on Complex Policies

**The problem:** Row Level Security (RLS) policies are evaluated on every query. Complex policies (joins, subqueries, function calls) can make simple queries slow. Supabase does not cache RLS evaluations.

**Warning signs:**
- Simple read queries take 100ms+ when they should take 10ms
- Query performance degrades as table size grows (RLS policy does a full scan)
- `EXPLAIN ANALYZE` shows the RLS policy filter as the bottleneck

**Prevention strategy:**
- Keep RLS policies simple: compare `auth.uid()` against a column in the same row. Avoid subqueries in policies.
- For the "public feed" queries (browsing answers by question, browsing answers by person), those are public reads. Use a policy like `USING (true)` for SELECT on the answers table. Public content = no RLS overhead on reads.
- For write operations (submitting answers, updating profile), use simple `auth.uid() = user_id` checks.
- If you need role-based access (admin panel), consider a `user_roles` table with a simple RLS policy rather than complex function calls in the policy itself.
- Use `security definer` functions for complex operations that need to bypass RLS (e.g., admin batch operations), rather than making RLS policies complex enough to handle admin cases.

**Phase:** Phase 1 schema design. Get RLS policies right from the start. Refactoring policies later is painful.

### 4.2 Auth Edge Cases

**The problem:** Supabase Auth with social providers has specific edge cases that can lock users out or create duplicate accounts.

**Specific issues:**
- **Email collision:** If a user signs up with Google (john@gmail.com) and later tries LinkedIn (same email), Supabase may create two separate accounts or fail to link them, depending on your `auto_confirm` and `enable_manual_linking` settings.
- **Missing email:** LinkedIn sometimes does not return an email (user has it hidden). Your app breaks if you assume email is always present.
- **Session persistence:** Supabase uses localStorage for session tokens in the browser. If a user clears their browser data, they need to re-authenticate. This is expected but can surprise users.

**Warning signs:**
- Users report "I can't log in" after switching between Google and LinkedIn
- User table has duplicate entries for the same person
- Auth errors in logs mentioning "email already registered"

**Prevention strategy:**
- Enable `auto_confirm` for social logins (users verified by the provider, no need for email confirmation).
- Handle the "no email" case explicitly. Either require email during onboarding (ask user to enter it) or make email optional in your schema.
- Configure Supabase to link accounts by email: if a user logs in with LinkedIn and then Google using the same email, they should be the same account. Test this flow explicitly during Phase 1.
- Add a "link accounts" flow in settings where users can connect both Google and LinkedIn to the same profile.

**Phase:** Phase 1, auth setup. Test the multi-provider linking flow before inviting beta users.

### 4.3 Free Tier Limits

**The problem:** Supabase free tier (as of early 2026) includes:
- 500 MB database storage
- 1 GB file storage
- 50,000 monthly active users (auth)
- 2 GB bandwidth
- Paused after 7 days of inactivity (no requests)
- 2 projects max

**Warning signs:**
- Database paused because nobody logged in for a week (kills beta momentum)
- Bandwidth exceeded from serving profile images through Supabase Storage
- You hit the 500 MB database limit faster than expected (unlikely for text, but possible with analytics/logs)

**Prevention strategy:**
- The auto-pause on inactivity is the biggest risk for a beta. Set up a simple health-check cron (even a free UptimeRobot ping to your Supabase endpoint) to prevent pausing. Or upgrade to Pro ($25/month) once beta is active.
- For profile images, use Supabase Storage but serve them through a CDN or let Next.js Image optimization handle caching. Do not serve large images directly from Supabase on every page load.
- 500 MB is plenty for text-only content (answers, questions, profiles). You would need millions of answers to approach it. If you add image uploads for profiles, watch storage.
- Bandwidth: 2 GB is tight if the platform gets any traction. A single page load fetching answers + profiles could be 50-100KB. At 20,000 page views/month, that is 1-2 GB. Plan to upgrade before public launch.

**Phase:** Phase 1 awareness. Upgrade to Pro when beta has 10+ regular users to avoid the pause risk.

### 4.4 Realtime Subscription Limits

**The problem:** Supabase Realtime has connection limits on free tier (200 concurrent connections) and can be expensive at scale. If you use Realtime for live-updating feeds, each open browser tab is a persistent WebSocket connection.

**Warning signs:**
- Users see stale data (Realtime connection silently dropped)
- Connection errors in browser console
- Supabase dashboard shows connection limit warnings

**Prevention strategy:**
- Do NOT use Realtime for the public feed. A daily-question platform does not need real-time updates. Use standard HTTP fetches with appropriate cache headers.
- If you want "live" answer counts (e.g., "3 experts have answered today's question"), use polling with a 60-second interval rather than Realtime subscriptions.
- Reserve Realtime for true interactive features (if you add them later, like live answer reactions).

**Phase:** Phase 1 architecture decision. Avoid Realtime from the start. Saves complexity and cost.

### 4.5 Migration and Schema Changes

**The problem:** Supabase schema changes in production require careful migration. The dashboard SQL editor is convenient for development but dangerous for production. No built-in migration versioning.

**Warning signs:**
- You make a schema change in the Supabase dashboard and forget what you changed
- RLS policies get out of sync between development and production
- You cannot reproduce your production schema from code

**Prevention strategy:**
- Use Supabase CLI for local development. Write migrations as SQL files in `supabase/migrations/`. Apply them with `supabase db push` or `supabase migration up`.
- Never make schema changes through the production dashboard. Always go through migration files.
- Keep RLS policies in migration files, not just the dashboard. Policies are code; treat them like code.
- Version your seed data (initial questions, admin users) in a seed file.

**Phase:** Phase 1 setup. Set up Supabase CLI and migration workflow before writing any schema.

---

## 5. Next.js App Router Common Mistakes

### 5.1 Hydration Mismatches

**The problem:** Server Components render on the server, Client Components render on both server and client. If the server-rendered HTML does not match the client-rendered HTML, React throws a hydration error. Common causes: using `Date.now()`, `Math.random()`, `window` checks, or localStorage in components that render on the server.

**Warning signs:**
- Console warnings: "Text content did not match. Server: '...' Client: '...'"
- Flickering UI on page load (server renders one thing, client re-renders another)
- Components show stale data on first render, then update

**Prevention strategy:**
- Use `'use client'` directive on any component that accesses browser APIs (localStorage, window, navigator).
- For date-dependent content (today's question), render on the server using UTC or a consistent timezone. Do NOT use the user's local timezone for server rendering.
- Use `Suspense` boundaries around client components that depend on browser-only data. Show a skeleton/placeholder during hydration.
- Do NOT conditionally render based on `typeof window !== 'undefined'` in the render path. Instead, use `useEffect` to set client-only state after mount.

**Phase:** Phase 1, component architecture. Establish the Server/Client Component boundary early.

### 5.2 Caching Gotchas (Data Cache, Full Route Cache)

**The problem:** Next.js App Router aggressively caches `fetch` calls and full route renders. By default, `fetch` in Server Components is cached indefinitely (static). If your question-of-the-day changes daily but the page is cached, visitors see yesterday's question.

**Warning signs:**
- Deployed page shows stale question (cache not invalidated)
- New answers do not appear on the public feed after posting
- `revalidate` is not set and data appears frozen after deploy

**Prevention strategy:**
- For the daily question page, use `revalidate = 3600` (hourly) or `revalidate = 60` (every minute) depending on freshness needs. A daily question changing once per day needs at most hourly revalidation.
- For answer feeds, use `revalidatePath()` or `revalidateTag()` after a new answer is submitted. This is the on-demand revalidation pattern.
- Understand the three caches: Data Cache (fetch results), Full Route Cache (rendered HTML), Router Cache (client-side navigation). Each has different invalidation rules.
- For the admin panel (managing question queue), disable caching entirely: `export const dynamic = 'force-dynamic'` or `export const revalidate = 0`.
- Do NOT rely on `cache: 'no-store'` as a blanket solution. It disables all caching and puts full load on Supabase for every request.

**Phase:** Phase 1 architecture. Define caching strategy per route before building pages.

### 5.3 Server Component Limitations

**The problem:** Server Components cannot use hooks (`useState`, `useEffect`), event handlers (`onClick`), or browser APIs. If you try to add interactivity to a Server Component, you must refactor it into a Client Component or extract the interactive part.

**Warning signs:**
- Build errors: "useState is not defined" in a Server Component
- You find yourself adding `'use client'` to every file (defeats the purpose)
- Server Components cannot display user-specific data without becoming Client Components

**Prevention strategy:**
- Design the component tree with a clear Server/Client boundary:
  - **Server Components:** Layout, page shells, data fetching, SEO metadata, static content
  - **Client Components:** Interactive forms (answer textarea), auth state display, toggle buttons, client-side navigation
- Compose: Server Components can render Client Components as children. A Server Component page can fetch the question data, then pass it as props to a Client Component answer form.
- Use Server Actions for form submissions (answer submission, profile updates). Server Actions work from Client Components but execute on the server.

**Phase:** Phase 1, component architecture. Decide the boundary before building.

### 5.4 Server Actions Footguns

**The problem:** Server Actions are async functions that run on the server but can be called from Client Components. They are powerful but have sharp edges: they serialize all arguments (no functions, no complex objects), they can be called by anyone (no built-in auth check), and error handling is non-obvious.

**Warning signs:**
- Security flaw: a Server Action that modifies data without checking `auth.uid()`. Anyone can call it via POST request.
- Data mutation succeeds but the UI does not update (forgot to call `revalidatePath`)
- Large payloads in Server Action arguments (the whole form state serialized)

**Prevention strategy:**
- ALWAYS check auth inside Server Actions. Never trust the client. Start every Server Action with `const { data: { user } } = await supabase.auth.getUser()` and return early if not authenticated.
- Call `revalidatePath('/path')` or `revalidateTag('tag')` after every mutation to ensure cached pages reflect the change.
- Keep Server Action arguments small (IDs, short strings). Fetch large data on the server side, do not pass it from the client.
- Use `useFormStatus` and `useOptimistic` for responsive UI during Server Action execution.

**Phase:** Phase 1, when building answer submission and admin panel.

### 5.5 Middleware Misuse

**The problem:** Next.js Middleware runs on every request (at the Edge). It is tempting to put auth checks here, but Middleware has limited APIs (no Node.js, no database access, limited Supabase client). Misconfigured middleware can break the entire app.

**Warning signs:**
- Middleware makes a Supabase query on every request (slow, expensive)
- Public pages blocked behind auth because middleware is too aggressive
- Middleware runs on static assets (images, fonts) — wasted compute

**Prevention strategy:**
- Use Middleware only for: session refresh (Supabase recommends this for keeping auth tokens fresh), redirects (logged-out users hitting protected routes), and header manipulation.
- Do NOT use Middleware for data fetching or complex auth logic. Do auth checks in Server Components or Server Actions where you have full Node.js access.
- Configure the `matcher` in `middleware.ts` to exclude static files: `matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']`
- Use the `@supabase/ssr` package for proper cookie-based auth in Middleware.

**Phase:** Phase 1, auth setup. Follow Supabase's official Next.js + App Router guide.

---

## 6. Platform-Killing Mistakes

### 6.1 What Makes Experts Stop Contributing

**Silence kills faster than criticism.** The primary reasons experts leave:

1. **No feedback loop.** They post an answer and hear nothing. No views, no reactions, no evidence anyone read it. Fix: show view counts from day one, even if small.

2. **Questions not worth answering.** If experts repeatedly look at the daily question and think "meh, not worth spending an answer on," they stop checking. Fix: Question curation is the most important editorial function. Track skip rates.

3. **Friction in the answer flow.** If writing an answer requires more than 2 clicks and a text box, experts bounce. Fix: The answer UX must be friction-free. Open question, write, submit. No drafts, no previews, no formatting options in v1.

4. **Peer comparison anxiety.** If experts see other experts' answers before posting, they either (a) feel intimidated and don't post, or (b) anchor on others' perspectives and homogenize. Fix: Consider hiding other answers until the expert has submitted their own (or until the question closes).

5. **Platform feels dead.** If they log in and see the same question from 3 days ago, or only 1 other person answered, the platform feels abandoned. Fix: fresh question every day, no exceptions. Show activity signals ("12 experts are considering today's question").

### 6.2 What Makes Readers Stop Coming Back

1. **Nothing new to read.** If the feed is the same as yesterday (no new answers, same question), there is no reason to return. Fix: the daily question cadence is your forcing function. Make the homepage always show today's question with a count of new answers.

2. **Answers are shallow.** If scarcity does not produce quality — if experts post generic platitudes — readers get nothing they cannot find on LinkedIn. Fix: question quality drives answer quality. Also, a word minimum (50-100 words?) can prevent throwaway answers.

3. **No discovery path.** If readers can only see today's question, the archive is invisible. Fix: "Explore past questions" and "Browse by expert" must be prominent from day one.

4. **No reason to share.** If answer pages have no social metadata (OG tags, nice previews), readers cannot share interesting answers on LinkedIn/Twitter. The growth loop dies. Fix: build shareable answer cards with OG images from Phase 1.

### 6.3 What Kills the Growth Loop

The intended growth loop: Expert answers on Ethos -> Expert shares answer link on LinkedIn -> LinkedIn connection clicks link -> Visits Ethos -> Discovers other answers -> Signs up as reader or expert.

This loop breaks if:
- **Share links do not render well.** LinkedIn preview must show: expert name, question, first ~150 chars of answer, Ethos branding. Build OG tag generation as a core feature.
- **Landing page requires login to read.** Public-by-default content is a stated requirement. Do not gate reading behind auth. Ever.
- **The shared answer is the only content.** If someone clicks through and sees one answer with no context, they leave. Surround every answer with: the question, other experts' answers, related questions, expert's other answers.

---

## 7. Solo Operator Overhead Surprises

### 7.1 Content Moderation

**The surprise:** Even with 50 experts, you will get: off-topic answers, self-promotional answers, low-effort answers, and eventually an answer that is offensive or legally problematic. You need a moderation plan.

**Prevention strategy:**
- Build a simple admin flag/hide capability. Do not build a full moderation queue for beta.
- Set clear contribution guidelines upfront: "Answers should be original, substantive, and relevant to the question."
- For beta with known experts, moderation is low-risk. For scale, you will need community guidelines and a reporting flow.

**Phase:** Phase 1 (basic hide/flag in admin panel). Phase 3+ (community moderation).

### 7.2 Question Curation is a Daily Job

**The surprise:** "One question per day" means you need 365 questions per year. Good questions require thought, relevance, and variety. After 30 days, the easy questions are gone. After 90 days, you are working hard to avoid repetition.

**Prevention strategy:**
- Build a question backlog of 60+ questions before launch. Aim for 90.
- Build the admin panel to show queue depth ("X questions scheduled, Y unscheduled"). Alert when queue drops below 14 days.
- Allow multi-editor support so 2-3 editorial collaborators can propose questions. This is in the requirements but must be built early.
- Track question categories/themes to ensure diversity. Do not publish 5 leadership questions in a row.

**Phase:** Pre-launch (build backlog). Phase 1 (admin panel with queue management).

### 7.3 Expert Relationship Management

**The surprise:** You will spend more time emailing experts than building features. "Can you check my profile?" "How do I delete an answer?" "Can I get more answers this month?" "I forgot to answer yesterday's question." Multiply by 50 experts.

**Prevention strategy:**
- Build self-service for common operations: edit profile, delete own answer, view remaining budget. Every email you prevent is 5-10 minutes saved.
- Write a FAQ/help page with answers to the top 10 questions before they are asked.
- Set expectations in the expert onboarding email: how the platform works, what the limits are, how to get help.

**Phase:** Phase 1 (self-service profile/answer management). Phase 2 (FAQ, onboarding flow).

### 7.4 Uptime and Incident Response

**The surprise:** When the platform is down, experts cannot answer the daily question. Their limited answer budget makes downtime more painful — they might miss the one question they wanted to answer all month.

**Prevention strategy:**
- Use Vercel for hosting (high uptime, auto-scaling, no DevOps needed).
- Set up basic monitoring (Vercel Analytics, UptimeRobot or similar). Be notified within minutes if the site is down.
- Supabase free tier auto-pause is the biggest uptime risk (see section 4.3). Prevent it.
- If downtime occurs on a specific day, consider extending that day's question by 24 hours or granting a bonus answer. Have a plan.

**Phase:** Phase 1 (monitoring setup). Ongoing operational concern.

### 7.5 Data Privacy and Legal

**The surprise:** You are collecting real names, email addresses, LinkedIn profiles, and written content from experts. This is personal data. Depending on your users' locations, GDPR, CCPA, and similar regulations may apply.

**Prevention strategy:**
- Write a simple privacy policy before launch. It needs to cover: what data you collect, why, how long you keep it, and how users can request deletion.
- Implement account deletion. Users must be able to delete their profile and all associated data. This is a legal requirement in many jurisdictions.
- Do not store LinkedIn access tokens longer than needed. Use them for initial auth, then discard.
- Terms of Service should cover: content ownership (experts own their answers, you have a license to display them), acceptable use, and termination.

**Phase:** Phase 1 (privacy policy, ToS, account deletion). Non-negotiable for launch.

---

## 8. Phase Mapping

Summary of which phase should address each pitfall:

### Pre-Launch (Before Beta Opens)
- Seed content: 2-3 weeks of expert answers before readers see the platform
- Question backlog: 60-90 questions ready
- Expert recruitment: 10-15 committed experts from warm network
- LinkedIn Developer app: created, OpenID Connect approved
- Privacy policy and Terms of Service: written and published
- Supabase CLI + migration workflow: established

### Phase 1 (Beta: 20-50 Users)
- Scarcity mechanic tuning (3 free / 5 premium, calendar vs. rolling)
- Read experience must be engaging without answering (browse by question, browse by person)
- Server/Client Component boundary defined
- Caching strategy per route defined
- RLS policies: simple, performant, correct
- Auth: multi-provider linking tested (Google + LinkedIn)
- OG tags for shareable answer links
- Admin panel: question queue, basic moderation (hide/flag)
- Self-service: edit profile, delete answer, view budget
- Basic monitoring (uptime, error tracking)
- Account deletion capability

### Phase 2 (Post-Beta Validation)
- View counts and basic analytics for experts
- Premium tier: extended queue preview, analytics dashboard
- FAQ / help documentation
- Expert onboarding flow improvements
- Supabase upgrade to Pro tier

### Phase 3+ (Growth)
- LinkedIn sharing integration (requires separate API approval)
- Community moderation tools
- Advanced analytics
- Content moderation at scale

---

## Key Takeaways

1. **The scarcity mechanic is the product.** Get it right or nothing else matters. Too tight kills engagement; too loose removes differentiation. Start conservative (3/month) and measure.

2. **The read experience is as important as the write experience.** Experts will not answer if nobody reads. Readers will not come if there is nothing to read. Solve the cold start problem aggressively.

3. **LinkedIn OAuth is simpler than expected for basic login** but will not give you profile enrichment data. Design for user-entered profile fields from the start.

4. **Supabase's biggest risk is the free tier auto-pause.** Upgrade or set up keep-alive before beta users encounter a sleeping database.

5. **Next.js App Router caching will bite you.** Define the caching strategy per route before building. The daily-question-with-fresh-answers pattern requires deliberate revalidation.

6. **Solo operator overhead is dominated by people, not technology.** Question curation and expert relationship management will consume more time than code. Build self-service features early.
