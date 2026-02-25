# Feature Research: Expert Q&A and Curated Content Platforms

**Analysis Date:** 2026-02-25
**Context:** Ethos is a platform where influencers/SMEs answer one curated daily question with a scarcity mechanic (3-5 answers/month). This research maps the competitive landscape to identify table stakes, differentiators, and anti-features.

---

## 1. Table Stakes (Must Have or Users Leave)

These are baseline expectations from anyone who has used Quora, Substack, Twitter/X, or any expert platform. Missing these creates friction that overshadows any clever mechanic.

### 1.1 Identity and Profiles

| Feature | Where it exists | Complexity | Notes |
|---------|----------------|------------|-------|
| Social login (OAuth) | Every modern platform | Low | LinkedIn + Google covers Ethos's target users. Email/password is friction. |
| Public profile page | Quora, Substack, Twitter/X, Maven, Intro, Clarity.fm | Low | Name, photo, bio, credentials. Non-negotiable. |
| Answer archive on profile | Quora (answer history), Substack (post archive), Twitter/X (replies tab) | Low | "What has this person chosen to answer?" is Ethos's core browse-by-person view. |
| Shareable profile URL | Every platform | Low | Clean `/username` or `/u/slug` path. Social sharing requires this. |
| Professional identity signals | LinkedIn (title, company), Clarity.fm (rate + reviews), Maven (course ratings) | Medium | At minimum: headline, current role, organization. See Section 2.3 for deeper credibility. |

**Dependency chain:** OAuth -> Profile -> Answer archive -> Shareable URLs. Build in this order.

### 1.2 Content Display and Discovery

| Feature | Where it exists | Complexity | Notes |
|---------|----------------|------------|-------|
| Clean, readable answer display | Quora, Substack | Low | Rich text rendering. Answers are the product — they must look excellent. |
| Browse by question (all answers) | Quora (question page), Polymarket (event comments) | Low | Primary discovery axis. "What did experts say about X?" |
| Browse by person (answer history) | Quora (profile), Twitter/X (profile) | Low | Secondary axis. "What does this expert choose to weigh in on?" |
| Chronological daily feed | Substack Notes, Twitter/X timeline | Low | Today's question + today's answers as the default landing experience. |
| Past questions archive | Quora (question log), any blog platform | Low | Yesterday's and older questions remain browsable. Not just ephemeral. |
| Shareable answer links | Every platform | Low | Deep link to a specific answer. Essential for social distribution. |
| Open Graph / social card previews | Substack, Medium, any modern content platform | Medium | When someone shares an answer link on LinkedIn/X, it must render a rich card with expert name, question snippet, and answer preview. Without this, social sharing is dead on arrival. |

**Dependency chain:** Answer display -> Feed views (by question, by person) -> Shareable links -> OG cards.

### 1.3 Content Creation (Answering)

| Feature | Where it exists | Complexity | Notes |
|---------|----------------|------------|-------|
| Clean text editor for answers | Quora, Substack, every content platform | Low | Textarea with basic formatting. Not a full editor — short-form answers. |
| Draft auto-save | Substack, Google Docs, Medium | Low | If I start writing and navigate away, my draft survives. |
| Clear answer budget display | Unique to Ethos's model, but analogous to Polymarket's position sizing | Low | "You have 2 answers remaining this month." Always visible when composing. |
| Mobile-responsive answer input | Every modern platform | Low | Target users will encounter questions on mobile via social links. Must be able to answer from phone. |

### 1.4 Admin / Editorial

| Feature | Where it exists | Complexity | Notes |
|---------|----------------|------------|-------|
| Question creation and scheduling | Any CMS (WordPress scheduled posts, Substack scheduling) | Medium | Create question, assign publish date, reorder queue. |
| Multi-editor access | Substack (multiple writers), WordPress (roles) | Medium | 2-5 editorial team members can create/edit questions. Role-based: editor vs. admin. |
| Question queue management | Newsletter platforms (scheduled email queue), podcast platforms | Medium | See upcoming questions, drag to reorder, gap detection. |

---

## 2. Differentiators (Competitive Advantage)

These are features and mechanics that make Ethos distinct from "another Quora." The scarcity mechanic is the core innovation — everything here amplifies it.

### 2.1 Scarcity Mechanics That Work

**Research across scarcity-driven platforms:**

| Platform/Mechanic | How scarcity works | What Ethos can learn |
|-------------------|-------------------|---------------------|
| **Polymarket** (prediction markets) | You put real money on predictions — finite budget forces selectivity | The "skin in the game" psychology. When answering costs something (even just 1 of 3 monthly tokens), the signal value of choosing to answer goes up. |
| **BeReal** | One random daily prompt, 2-minute window to respond | Time-scarcity creates urgency and authenticity. Ethos's daily question creates a similar rhythm, though without the time pressure. |
| **Clubhouse (early days)** | Invite-only access, ephemeral rooms | Exclusivity drove perceived value. Ethos's expert-only answering (not everyone can answer) creates similar dynamics. |
| **Gmail launch** | Invite-only created massive demand | Supply constraint on the *answerer* side (limited monthly budget) is the Ethos version. |
| **Physical gallery shows** | Limited editions increase per-piece value | 3-5 answers/month = limited edition content from each expert. |
| **Snapchat Stories (original)** | Ephemeral content drove deliberate creation | Not directly applicable (Ethos answers persist), but the *deliberateness* of creation under constraint is the same psychology. |

**Key insight:** Scarcity works when it is (a) clearly communicated, (b) consistently enforced, and (c) the constraint itself becomes part of the content's meaning. "This expert only had 3 answers this month and chose THIS question" is the narrative.

**Features to amplify scarcity:**

| Feature | Complexity | Why it matters |
|---------|------------|---------------|
| Visible answer budget ("2 of 3 remaining") | Low | Constant awareness of the constraint. Users should feel the weight of each answer. |
| "X chose to answer" signal on each answer | Low | Surface the selection itself as content. Not just "here's an answer" but "here's what they *chose*." |
| Monthly answer count on profile | Low | "Sarah answered 3 questions in February" — pattern of selectivity becomes part of identity. |
| Answer budget reset notification | Low | "Your 3 answers reset tomorrow" — creates end-of-month urgency for unused answers. No rollover. |
| No editing after publish (or limited window) | Low | Commitment device. Once you spend an answer, it's spent. Reinforces deliberateness. |
| "Passed" indicator (optional) | Medium | Let experts publicly "pass" on a question to signal "I saw it, deliberately skipped." Risky — could feel performative. Worth testing. |

**Dependency:** Answer budget display depends on auth + answer tracking. Everything else builds on that.

### 2.2 Queue and Scheduling Visibility

This is the "strategic game" dimension from PROJECT.md — experts decide whether to answer today or save for a better question later.

| Platform analog | How visibility works | Ethos application |
|-----------------|---------------------|-------------------|
| **Newsletter scheduling** (Substack, Mailchimp) | Creators see their own upcoming schedule | Experts see upcoming questions (depth varies by tier). |
| **TV programming guides** | Viewers see what's coming to decide what to watch/record | Same psychology: "Thursday's question is better — I'll save my answer." |
| **Spotify Wrapped / Year in Review** | Retrospective engagement data | Monthly/yearly "what you answered" recap for experts. |
| **Stock market pre-market** | Preview of upcoming activity informs current decisions | Queue preview informs answer budget allocation. |

**Tiered queue visibility features:**

| Feature | Tier | Complexity | Notes |
|---------|------|------------|-------|
| See today's question | All | Low | Baseline. |
| See tomorrow's question | Free | Low | One day of lookahead creates minimal strategic play. |
| See next 3 days | Free | Low | Alternative to tomorrow-only. Small window. |
| See full week ahead | Premium | Low | Enough to plan around the weekend. |
| See full month ahead | Premium | Low | Maximum strategic value. "I want to save my last answer for the 28th." |
| Calendar view of upcoming questions | Premium | Medium | Visual representation of the queue. More useful than a list once you're planning 2+ weeks out. |
| "Remind me" / bookmark a future question | Premium | Medium | "I want to answer this one on the 15th — remind me." Drives return visits. |

**Dependency:** Queue visibility depends on admin question scheduling being built first. Tiering depends on auth + plan tracking.

### 2.3 Expert Credibility Signals Beyond Follower Counts

What platforms use today and what Ethos can do differently:

| Signal type | Where it exists | Ethos version | Complexity |
|-------------|----------------|---------------|------------|
| **Follower/subscriber count** | Twitter/X, Quora, Substack | Deliberately omit or de-emphasize. Not the signal Ethos is about. | N/A |
| **Platform-native metrics** (views, upvotes) | Quora (upvotes), Medium (claps) | Omit in v1. See Anti-Features. | N/A |
| **Professional title + org** | LinkedIn, Clarity.fm (hourly rate as proxy) | Yes — headline, role, company. Pulled from LinkedIn OAuth where possible. | Low |
| **Answer selectivity ratio** | Unique to Ethos | "Answered 3 of 28 questions this month." The lower the ratio, the more selective. | Low |
| **Topic consistency** | Quora (topic expertise badges) | Which categories/topics does this expert consistently answer? Emergent from answer history. | Medium |
| **External verification** | Twitter/X (blue check), Clarity.fm (reviews) | LinkedIn verification via OAuth is implicit. Additional verification is out of scope for beta. | Low (via OAuth) |
| **Answer tenure** | Stack Overflow (reputation over time) | "Member since Feb 2026. 47 answers across 14 months." Longevity = commitment. | Low |
| **Chosen-by-others signal** | Quora (most upvoted answer), any ranking | "Featured answer" — editorial pick per question. Curated, not crowd-voted. | Medium |

**Key insight for Ethos:** The scarcity mechanic itself IS the credibility signal. "This person has 3 answers a month and chose to spend one here" is more powerful than any badge. Build the profile around surfacing *selectivity patterns*, not vanity metrics.

### 2.4 Monetization Levers (Post-Beta)

Not building now, but architecture should not block these:

| Lever | How it works | Complexity to add later |
|-------|-------------|------------------------|
| Premium tier (more answers + full queue) | Subscription via Stripe | Medium — needs billing integration |
| Sponsored questions | Brands pay to have a question featured | Low — just a flag on the question model |
| Expert analytics (reach/engagement data) | Premium feature showing who read your answers | Medium — needs view tracking |
| Embeddable answer widgets | Experts embed their Ethos answers on personal sites | Medium — iframe/oEmbed endpoint |
| API access to answer archives | For research, media, or content syndication | Medium-High — needs rate limiting, auth |

---

## 3. Anti-Features (Deliberately Do NOT Build)

### 3.1 What Kills Expert Participation

Research across platforms shows consistent patterns for why experts stop contributing:

| Anti-feature | Why experts leave | Platform where this failed |
|-------------|-------------------|--------------------------|
| **Comments/replies on answers** | Experts get dogpiled by less-informed commenters. The asymmetry is exhausting. Senior people will not wade into reply threads. | Quora (experts left as comment quality declined), Twitter/X (quote-tweet dunking) |
| **Public downvotes or disagreement metrics** | Nobody with a professional reputation wants a public "53% disagree" badge on their expertise. | Quora (downvotes), Reddit (controversial markers) |
| **Notifications for every interaction** | Notification fatigue drives experts to mute the platform, then forget it exists. | Every social platform — LinkedIn is particularly notorious. |
| **Algorithmic feed that buries content** | "I put effort into this answer and 12 people saw it" kills motivation. | Facebook (organic reach collapse), Twitter/X (algorithm changes) |
| **Requiring regular activity to maintain visibility** | Experts are busy. Penalizing them for a quiet month (algorithmic suppression, "inactive" badges) pushes them to platforms that respect their time. | Quora (answer ranking favors recency), Instagram (algorithm punishes inconsistency) |
| **Gamification that trivializes expertise** | Points, badges, leaderboards make experts feel like they're competing in a game rather than sharing knowledge. | Quora (credits system), Stack Overflow (reputation gaming) |
| **Asking experts to recruit/invite others** | "Invite 5 friends to unlock features" is beneath the dignity of senior professionals. | Clubhouse (burned social capital on invites) |
| **Mandatory profile completeness nags** | "Your profile is 60% complete!" is consumer-app behavior that signals the platform doesn't respect the expert's time. | LinkedIn (constant nags), every platform with a progress bar on profiles |

**Design principle for Ethos:** The platform should feel like being invited to a dinner party, not joining a social network. Minimal friction, maximum signal, zero nagging.

### 3.2 What Creates Noise Instead of Signal

| Anti-feature | Why it creates noise | Ethos stance |
|-------------|---------------------|-------------|
| **Open question submission** (anyone can ask) | Quality collapse. The question IS the product — it must be editorially curated. | Questions are admin-only. No user-submitted questions in v1. |
| **Unlimited answers** | If everyone can answer everything, nothing signals expertise. The constraint IS the feature. | Hard cap: 3-5/month. Non-negotiable. |
| **Likes/reactions on answers** | Creates popularity contest dynamics. Experts optimize for likes instead of insight. | No reactions in v1. Maybe "save/bookmark" later (private, not public). |
| **Real-time posting (no schedule)** | Without a daily rhythm, the platform becomes a firehose. The one-question-per-day cadence is the editorial voice. | One question per day, published at a consistent time. |
| **Trending/viral mechanics** | "This answer is trending!" creates pressure to write for virality, not for substance. | No trending, no virality metrics. Answers are surfaced chronologically and editorially. |
| **Follow/unfollow social graph** | Creates in-group/out-group dynamics. Experts check follower counts instead of answering well. | No following in v1. Everyone sees the same feed. Discovery is question-first, not person-first. |
| **AI-generated answer suggestions** | "Need help writing your answer?" undermines the entire premise of authentic expert voice. | No AI assistance in the answer flow. Ever. |
| **Character limits that are too short** | Twitter-length answers become hot takes, not expertise. | No hard character limit, but design should encourage 100-500 words (substantial but focused). Word count guidance, not enforcement. |
| **Character limits that are too long** | 5,000-word essays turn answers into blog posts and raise the effort bar prohibitively. | Soft guidance toward concise answers. UI design (card-based display) naturally discourages essays. |

### 3.3 Infrastructure Anti-Patterns

| Anti-pattern | Why to avoid | Notes |
|-------------|-------------|-------|
| **Email notifications by default** | Opt-in only. Experts will mark as spam and never return. | One transactional email: "Your answer budget resets tomorrow." That's it. |
| **Complex onboarding flows** | LinkedIn OAuth -> set headline -> done. No 7-step wizard. | 2 screens max: login, confirm profile. |
| **Analytics dashboards for experts (v1)** | Premature complexity. Ship the core loop first. | Architecture should support adding analytics later (track views), but don't surface them yet. |
| **Mobile app** | Web-first. Responsive design covers mobile use cases for beta. | PWA-ready architecture (service worker, manifest) if mobile demand emerges. |
| **Real-time features** (live updates, typing indicators) | Unnecessary complexity. Daily cadence means near-real-time is fine. | Standard request/response. Polling or SSE if needed later. |

---

## 4. Feature Priority Matrix

Mapping features against Ethos's beta launch scope (20-50 users):

### Must Build (Beta Launch)

| # | Feature | Complexity | Dependencies |
|---|---------|------------|-------------|
| 1 | Social login (LinkedIn + Google OAuth) | Low | Supabase Auth |
| 2 | Expert profile (name, photo, headline, bio) | Low | Auth |
| 3 | Daily question display | Low | Admin panel |
| 4 | Answer submission with budget tracking | Low | Auth, question display |
| 5 | Visible answer budget ("2 of 3 remaining") | Low | Answer tracking |
| 6 | Browse by question (all answers under one question) | Low | Answer storage |
| 7 | Browse by person (expert's answer archive) | Low | Profile + answer storage |
| 8 | Shareable answer links | Low | Answer display |
| 9 | OG/social card previews | Medium | Answer display, requires server-side rendering or edge function |
| 10 | Past questions archive | Low | Question storage |
| 11 | Admin: create + schedule questions | Medium | Auth (admin role) |
| 12 | Admin: multi-editor support (2-5 editors) | Medium | Admin panel, role-based auth |
| 13 | Question queue management (reorder, edit, delete) | Medium | Admin panel |
| 14 | Draft auto-save | Low | Answer submission |
| 15 | Mobile-responsive design | Low | All UI components |

### Should Build (Early Iteration)

| # | Feature | Complexity | Dependencies |
|---|---------|------------|-------------|
| 16 | Queue preview (tiered by plan) | Low-Medium | Question scheduling, plan tracking |
| 17 | "X chose to answer" signal on answer cards | Low | Answer tracking |
| 18 | Monthly answer count on profiles | Low | Answer tracking |
| 19 | Answer selectivity ratio on profiles | Low | Answer + question tracking |
| 20 | Topic/category tagging on questions | Low | Question model |
| 21 | No-edit-after-publish (or 15-min edit window) | Low | Answer submission |
| 22 | "Featured answer" editorial pick | Medium | Admin panel, answer display |
| 23 | Answer budget reset notification (email) | Medium | Email service, answer tracking |

### Could Build (Post-Validation)

| # | Feature | Complexity | Dependencies |
|---|---------|------------|-------------|
| 24 | Premium tier billing | Medium-High | Stripe, plan management |
| 25 | Calendar view of upcoming questions | Medium | Queue preview |
| 26 | "Remind me" bookmark on future questions | Medium | Queue preview, notification system |
| 27 | Expert analytics (views, reach) | Medium | View tracking infrastructure |
| 28 | Topic consistency badges on profiles | Medium | Category tracking, sufficient answer history |
| 29 | Embeddable answer widgets | Medium | oEmbed/iframe endpoint |
| 30 | Sponsored questions | Low | Question model (flag field), admin UI |
| 31 | Private "save/bookmark" on answers | Low | Auth, saved items storage |
| 32 | Monthly/yearly answer recap for experts | Medium | Answer history, email or in-app delivery |

---

## 5. Dependency Graph (Simplified)

```
Supabase Auth (LinkedIn + Google OAuth)
├── Expert Profiles
│   ├── Answer Archive (browse by person)
│   │   ├── Answer Selectivity Ratio
│   │   ├── Monthly Answer Count
│   │   └── Topic Consistency Badges
│   └── Shareable Profile URLs
├── Admin Role (role-based auth)
│   ├── Question Creation + Scheduling
│   │   ├── Daily Question Display
│   │   │   ├── Answer Submission + Budget Tracking
│   │   │   │   ├── Visible Budget Display
│   │   │   │   ├── Draft Auto-Save
│   │   │   │   ├── No-Edit-After-Publish
│   │   │   │   └── "X Chose to Answer" Signal
│   │   │   ├── Browse by Question (all answers)
│   │   │   │   ├── Featured Answer (editorial pick)
│   │   │   │   └── Shareable Answer Links
│   │   │   │       └── OG/Social Card Previews
│   │   │   └── Past Questions Archive
│   │   └── Queue Preview (tiered)
│   │       ├── Calendar View
│   │       └── "Remind Me" Bookmarks
│   ├── Multi-Editor Support
│   └── Queue Management (reorder, edit, delete)
└── Plan Tracking (free vs. premium)
    ├── Tiered Queue Visibility
    ├── Tiered Answer Budget (3 vs. 5+)
    └── Premium Billing (Stripe) [post-beta]
```

---

## 6. Key Takeaways for Ethos

1. **The scarcity mechanic is the product.** Every design decision should amplify the weight of "choosing to answer." Anything that dilutes selectivity (unlimited answers, reactions, comments) undermines the core value.

2. **Expert profiles are answer archives, not social profiles.** The profile is "what this person chose to answer" — not a bio page with follower counts. Build the profile around selectivity patterns.

3. **Editorial curation of questions is the moat.** The question quality determines whether experts bother answering. This is a content-editorial product, not a technology product. The admin panel for question management is as important as the public-facing UI.

4. **Social sharing is the growth engine.** Experts will share their own answers on LinkedIn/X. OG cards and shareable links are not nice-to-haves — they're the primary distribution mechanism. Build these well from day one.

5. **Respect expert time.** Two-click login, zero nagging, no notification spam, no gamification. The platform should feel like a curated salon, not a social network. If an expert can go from "saw the question on LinkedIn" to "published my answer" in under 3 minutes, the product works.

6. **Avoid the Quora failure mode.** Quora started with genuine experts and lost them to noise (comments, low-quality answers, gamification, algorithmic suppression). Every anti-feature in Section 3 is a lesson from Quora's trajectory. Ethos's constraints (limited answers, no comments, editorial questions) are deliberate defenses against this.

7. **The queue preview is the monetization hook.** Free users see enough to participate. Premium users see enough to *strategize*. This is the natural upsell because it's tied directly to the core mechanic, not bolted on.

---

*Research based on analysis of Quora, Substack Notes, Twitter/X, Polymarket, Maven, Intro.co, Clarity.fm, BeReal, Clubhouse, Stack Overflow, Medium, and general platform design patterns. No web sources were consulted for this analysis — conclusions drawn from established platform knowledge through early 2025.*
