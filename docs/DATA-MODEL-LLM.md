# Credo Data Model — LLM-Optimized Design

## Current State Assessment

17 tables, 43 indexes, 18 functions. The schema is well-structured for a web app but has gaps for LLM consumption:

**What's already good:**
- Stable UUIDs on all entities
- `created_at` / `updated_at` on core tables
- Explicit FKs for all relationships
- CHECK constraints acting as enums for statuses
- Denormalized counts for fast reads
- Full-text search vectors

**What's missing for LLM readiness:**
- No summary/description fields on answers (body is freeform prose, no structured extract)
- No tags/labels on answers (topics are on questions only)
- No confidence/quality signals beyond like_count
- No entity type field (LLMs need to know what they're looking at)
- No structured metadata on profiles (expertise areas, seniority, industry)
- Comments have no sentiment or type classification
- No activity/event log for temporal reasoning
- No explicit "this answer is about X" structured data

---

## 1. Recommended Entities

### Core Content (already exist — enhance)

| Entity | Table | Enhancement |
|--------|-------|-------------|
| **Profile** | `profiles` | Add `expertise_areas`, `seniority_level`, `industry` |
| **Question** | `questions` | Add `summary`, `intent_type`, `difficulty` |
| **Answer** | `answers` | Add `summary`, `key_claims`, `sentiment`, `quality_score` |
| **Topic** | `topics` | Already good — add `parent_topic_id` for hierarchy |
| **Comment** | `answer_comments` | Add `sentiment`, `comment_type` |

### Relationships (already exist — formalize)

| Entity | Table | Enhancement |
|--------|-------|-------------|
| **Follow** | `follows` | Already good |
| **Like** | `answer_likes` | Already good |
| **Bookmark** | `bookmarks` | Already good |
| **QuestionTopic** | `question_topics` | Add `relevance_weight` |
| **TopicFollow** | `topic_follows` | Already good |

### New Entities (add for LLM consumption)

| Entity | Purpose |
|--------|---------|
| **AnswerTag** | Structured labels on answers (auto-generated or admin-applied) |
| **ExpertiseArea** | Normalized expertise taxonomy for profiles |
| **ActivityEvent** | Temporal event log for reasoning about sequences |
| **ContentSummary** | LLM-generated summaries stored separately (enrichment layer) |

---

## 2. Schema for Each Entity

### Enhanced `profiles`

```sql
-- New columns (migration 00027)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  expertise_areas TEXT[] DEFAULT '{}';  -- e.g. ['engineering-leadership', 'developer-experience']

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  seniority_level TEXT CHECK (seniority_level IN (
    'individual_contributor', 'manager', 'director',
    'vp', 'c_suite', 'founder', 'investor', 'advisor'
  ));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  industry TEXT CHECK (industry IN (
    'technology', 'finance', 'healthcare', 'education',
    'media', 'consulting', 'government', 'nonprofit', 'other'
  ));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  enrichment_version INTEGER NOT NULL DEFAULT 0;  -- tracks incremental enrichment
```

**JSON export shape:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "profile",
  "handle": "sarah-chen",
  "display_name": "Sarah Chen",
  "headline": "COO, Meridian Ventures",
  "organization": "Meridian Ventures",
  "bio": "Operator turned investor. 15 years scaling B2B startups...",
  "role": "user",
  "seniority_level": "c_suite",
  "industry": "technology",
  "expertise_areas": ["operations", "scaling", "org-design"],
  "stats": {
    "answer_count": 8,
    "follower_count": 142,
    "following_count": 12,
    "answer_limit": 3
  },
  "created_at": "2026-01-15T09:00:00Z",
  "updated_at": "2026-03-14T14:30:00Z",
  "enrichment_version": 2
}
```

### Enhanced `questions`

```sql
-- New columns (migration 00027)
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS
  summary TEXT;  -- 1-2 sentence plain-language summary

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS
  intent_type TEXT CHECK (intent_type IN (
    'opinion', 'experience', 'advice', 'prediction',
    'reflection', 'framework', 'contrarian'
  ));

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS
  difficulty TEXT CHECK (difficulty IN (
    'accessible', 'intermediate', 'expert'
  ));

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS
  answer_count INTEGER NOT NULL DEFAULT 0;  -- denormalized

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS
  enrichment_version INTEGER NOT NULL DEFAULT 0;
```

**JSON export shape:**
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "type": "question",
  "slug": "measure-success-beyond-revenue",
  "body": "How do you measure success beyond revenue?",
  "summary": "Asks leaders to identify non-financial metrics they use to evaluate company health.",
  "intent_type": "framework",
  "difficulty": "intermediate",
  "category": "Leadership",
  "status": "published",
  "publish_date": "2026-02-01",
  "topics": ["leadership", "metrics", "strategy"],
  "stats": {
    "answer_count": 4,
    "bookmark_count": 12
  },
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-02-01T00:00:00Z",
  "enrichment_version": 1
}
```

### Enhanced `answers`

```sql
-- New columns (migration 00027)
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  summary TEXT;  -- 1-2 sentence extract of the core insight

ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  key_claims TEXT[] DEFAULT '{}';  -- structured list of claims made
  -- e.g. ['retention predicts revenue', 'voluntary surface area matters']

ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  sentiment TEXT CHECK (sentiment IN (
    'optimistic', 'cautious', 'contrarian', 'neutral', 'critical'
  ));

ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  quality_score REAL CHECK (quality_score BETWEEN 0 AND 1);
  -- composite: word_count weight + like_ratio + featured bonus

ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  enrichment_version INTEGER NOT NULL DEFAULT 0;
```

**JSON export shape:**
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "type": "answer",
  "question_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "expert_id": "550e8400-e29b-41d4-a716-446655440000",
  "body": "Revenue is a lagging indicator. By the time it shows up...",
  "summary": "Argues retention of top performers, time-to-decision, and voluntary initiative-taking are better leading indicators than revenue.",
  "key_claims": [
    "Revenue lags decisions by 12-18 months",
    "Top performer retention predicts company health",
    "Voluntary surface area indicates org vitality"
  ],
  "sentiment": "contrarian",
  "quality_score": 0.82,
  "word_count": 127,
  "stats": {
    "like_count": 24,
    "comment_count": 3,
    "view_count": 891
  },
  "moderation": {
    "hidden_at": null,
    "featured_at": "2026-02-15T12:00:00Z"
  },
  "created_at": "2026-02-01T14:30:00Z",
  "updated_at": "2026-02-15T12:00:00Z",
  "enrichment_version": 2
}
```

### Enhanced `answer_comments`

```sql
-- New columns (migration 00027)
ALTER TABLE public.answer_comments ADD COLUMN IF NOT EXISTS
  comment_type TEXT CHECK (comment_type IN (
    'agreement', 'disagreement', 'question',
    'addition', 'experience', 'general'
  ));

ALTER TABLE public.answer_comments ADD COLUMN IF NOT EXISTS
  sentiment TEXT CHECK (sentiment IN (
    'positive', 'negative', 'neutral', 'mixed'
  ));

ALTER TABLE public.answer_comments ADD COLUMN IF NOT EXISTS
  enrichment_version INTEGER NOT NULL DEFAULT 0;
```

**JSON export shape:**
```json
{
  "id": "b1234567-89ab-cdef-0123-456789abcdef",
  "type": "comment",
  "answer_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "user_id": "660e8400-e29b-41d4-a716-446655440000",
  "parent_id": null,
  "body": "This resonates. At my last company we tracked voluntary surface area...",
  "comment_type": "agreement",
  "sentiment": "positive",
  "created_at": "2026-02-02T09:15:00Z",
  "enrichment_version": 1
}
```

### New: `answer_tags`

```sql
CREATE TABLE public.answer_tags (
  answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,  -- normalized lowercase, e.g. 'leadership', 'hiring', 'metrics'
  source TEXT NOT NULL CHECK (source IN ('llm', 'admin', 'author')),
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),  -- NULL for admin/author
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (answer_id, tag)
);

CREATE INDEX idx_answer_tags_tag ON public.answer_tags (tag);
```

**JSON export shape:**
```json
{
  "answer_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "tag": "leading-indicators",
  "source": "llm",
  "confidence": 0.91,
  "created_at": "2026-03-14T10:00:00Z"
}
```

### New: `activity_events`

```sql
CREATE TABLE public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'answer_submitted', 'answer_featured', 'answer_hidden',
    'comment_posted', 'like_given', 'like_removed',
    'follow_started', 'follow_ended',
    'question_published', 'profile_updated',
    'report_filed', 'report_resolved'
  )),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN (
    'answer', 'question', 'profile', 'comment', 'report'
  )),
  target_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',  -- event-specific structured data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_events_actor ON public.activity_events (actor_id, created_at DESC);
CREATE INDEX idx_activity_events_target ON public.activity_events (target_type, target_id, created_at DESC);
CREATE INDEX idx_activity_events_type ON public.activity_events (event_type, created_at DESC);
```

**JSON export shape:**
```json
{
  "id": "c9876543-21ab-cdef-0123-456789abcdef",
  "type": "activity_event",
  "event_type": "answer_submitted",
  "actor_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_type": "answer",
  "target_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "metadata": {
    "question_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "word_count": 127,
    "budget_remaining": 1
  },
  "created_at": "2026-02-01T14:30:00Z"
}
```

### New: `content_summaries`

Separate enrichment table — LLM-generated summaries stored independently so they can be regenerated without touching source data.

```sql
CREATE TABLE public.content_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN (
    'answer', 'question', 'profile', 'topic'
  )),
  target_id UUID NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN (
    'one_liner', 'paragraph', 'key_points', 'comparison'
  )),
  body TEXT NOT NULL,
  model TEXT NOT NULL,  -- e.g. 'claude-sonnet-4-5-20250514'
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, summary_type)
);

CREATE INDEX idx_content_summaries_target
  ON public.content_summaries (target_type, target_id);
```

**JSON export shape:**
```json
{
  "id": "d1111111-2222-3333-4444-555555555555",
  "type": "content_summary",
  "target_type": "profile",
  "target_id": "550e8400-e29b-41d4-a716-446655440000",
  "summary_type": "paragraph",
  "body": "Sarah Chen is a C-suite operator and investor with 15 years scaling B2B startups. Her answers consistently emphasize leading indicators over lagging metrics, org design as a competitive advantage, and the importance of decision speed. Most engaged topics: leadership, operations, hiring.",
  "model": "claude-sonnet-4-5-20250514",
  "confidence": 0.88,
  "created_at": "2026-03-14T10:00:00Z"
}
```

---

## 3. Entity Relationship Map

```
profiles ─────────┬──< answers ──────┬──< answer_likes
  │                │                  ├──< answer_comments
  │                │                  ├──< answer_tags
  │                │                  └──< content_summaries
  │                │
  ├──< follows     ├──< questions ───┬──< question_topics ──> topics
  │                │                  ├──< bookmarks
  │                │                  └──< content_summaries
  ├──< notifications                 │
  ├──< reports                       ├──< answer_drafts
  ├──< api_keys                      │
  ├──< topic_follows ──> topics      └──< content_summaries (on topics)
  │
  └──< activity_events ──> (any target via target_type + target_id)
```

---

## 4. LLM-Friendly Design Improvements

### 4.1 Every record self-describes

Add a virtual `type` field in all JSON exports. Not stored in DB — added at the API/export layer:

```js
// In API route or export script
function toExportShape(table, row) {
  return { type: table, ...row }
}
```

This lets an LLM receiving a batch of mixed records distinguish them without context.

### 4.2 Summaries as first-class data

The `summary` field on answers and questions is the single highest-impact addition. An LLM processing 500 answers can read summaries instead of full bodies for filtering, then drill into bodies for the ones that matter.

**Enrichment strategy:** Run a nightly batch job:
```
SELECT id, body FROM answers WHERE summary IS NULL LIMIT 50
→ LLM: "Summarize in 1-2 sentences. Extract key claims as a list."
→ UPDATE answers SET summary = ?, key_claims = ?, enrichment_version = enrichment_version + 1
```

### 4.3 Structured claims enable comparison

`key_claims` on answers lets an LLM compare positions across experts:

```
"Which experts agree that retention predicts revenue?"
→ SELECT expert_id FROM answers WHERE 'retention predicts revenue' = ANY(key_claims)
```

Without this, the LLM must read every answer body and reason about semantic similarity.

### 4.4 Activity events enable temporal reasoning

```
"What happened after Sarah's answer was featured?"
→ SELECT * FROM activity_events
  WHERE created_at > (SELECT featured_at FROM answers WHERE id = ?)
  AND (target_id = ? OR metadata->>'question_id' = ?)
  ORDER BY created_at
```

Without an event log, the LLM must join across likes, comments, follows, and notifications to reconstruct the timeline.

### 4.5 Enrichment versioning

The `enrichment_version` column on every enrichable entity lets you:
- Track which records have been processed
- Re-run enrichment when models improve
- Know which data is stale

```sql
-- Find un-enriched answers
SELECT id FROM answers WHERE enrichment_version = 0;

-- Re-enrich everything after model upgrade
UPDATE answers SET enrichment_version = 0 WHERE enrichment_version < 3;
```

### 4.6 Confidence scores

Tags, summaries, and quality scores all include confidence values. An LLM consuming this data can filter by confidence threshold:

```
"Show me answers about hiring where we're confident about the topic"
→ SELECT a.* FROM answers a
  JOIN answer_tags t ON t.answer_id = a.id
  WHERE t.tag = 'hiring' AND t.confidence > 0.8
```

### 4.7 Export-friendly API routes

Add `/api/export/[entity]` routes that return complete, denormalized JSON:

```js
// /api/export/answers?since=2026-03-01&include=expert,question,tags
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const since = searchParams.get('since')

  const { data } = await supabase
    .from('answers')
    .select(`
      *,
      expert:profiles(id, handle, display_name, headline, seniority_level, expertise_areas),
      question:questions(id, slug, body, summary, intent_type, topics:question_topics(topic:topics(name, slug))),
      tags:answer_tags(tag, source, confidence)
    `)
    .gte('updated_at', since)
    .is('hidden_at', null)

  return Response.json(data.map(row => ({ type: 'answer', ...row })))
}
```

---

## 5. Anti-Patterns to Avoid

### 5.1 Burying facts in prose
**Bad:** Answer body says "I've been doing this for 15 years" — expertise duration is only in freeform text.
**Good:** `expertise_areas` and `seniority_level` on profile extract this into queryable fields.

### 5.2 Relationships only through UI
**Bad:** "Featured expert" stored as a `site_settings` key-value string.
**Good:** Already has `featured_expert_id` in site_settings — but should be a proper FK. Consider a `featured_experts` table with `start_date`, `end_date`, `reason`.

### 5.3 Ephemeral state with no history
**Bad:** Following/unfollowing leaves no trace — you only see current state.
**Good:** `activity_events` captures follow_started and follow_ended so you can reason about engagement over time.

### 5.4 Denormalized counts without provenance
**Bad:** `like_count = 24` — you know the number but not the trend.
**Good:** `activity_events` with `like_given` events lets you compute "likes this week vs last week" without a separate analytics table.

### 5.5 Untyped metadata blobs
**Bad:** `metadata JSONB` with no schema — every consumer must guess the shape.
**Good:** Document the metadata schema per event_type:

```
answer_submitted: { question_id, word_count, budget_remaining }
answer_featured:  { featured_by, question_id }
follow_started:   { follower_display_name }
report_filed:     { reason, target_type }
```

### 5.6 Missing timestamps on junction tables
**Bad:** Junction table with only two FKs and no timestamps.
**Good:** All junction tables already have `created_at` — this is correct. Keep it.

### 5.7 No enrichment separation
**Bad:** LLM-generated fields mixed into source-of-truth columns with no way to distinguish human vs machine data.
**Good:** `content_summaries` table is separate. `answer_tags.source` distinguishes 'llm' vs 'admin' vs 'author'. `enrichment_version` tracks freshness.

---

## 6. Implementation Guidance

### Phase 1: Schema additions (1 migration)

Create migration `00027_llm_enrichment.sql`:

```sql
-- Profile enrichment fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seniority_level TEXT CHECK (seniority_level IN (
    'individual_contributor','manager','director','vp','c_suite','founder','investor','advisor'
  )),
  ADD COLUMN IF NOT EXISTS industry TEXT CHECK (industry IN (
    'technology','finance','healthcare','education','media','consulting','government','nonprofit','other'
  )),
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER NOT NULL DEFAULT 0;

-- Question enrichment fields
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS intent_type TEXT CHECK (intent_type IN (
    'opinion','experience','advice','prediction','reflection','framework','contrarian'
  )),
  ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN (
    'accessible','intermediate','expert'
  )),
  ADD COLUMN IF NOT EXISTS answer_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER NOT NULL DEFAULT 0;

-- Answer enrichment fields
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS key_claims TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN (
    'optimistic','cautious','contrarian','neutral','critical'
  )),
  ADD COLUMN IF NOT EXISTS quality_score REAL CHECK (quality_score BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER NOT NULL DEFAULT 0;

-- Comment enrichment fields
ALTER TABLE public.answer_comments
  ADD COLUMN IF NOT EXISTS comment_type TEXT CHECK (comment_type IN (
    'agreement','disagreement','question','addition','experience','general'
  )),
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN (
    'positive','negative','neutral','mixed'
  )),
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER NOT NULL DEFAULT 0;

-- Answer tags
CREATE TABLE IF NOT EXISTS public.answer_tags (
  answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('llm', 'admin', 'author')),
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (answer_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_answer_tags_tag ON public.answer_tags (tag);

-- Activity events
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'answer_submitted','answer_featured','answer_hidden',
    'comment_posted','like_given','like_removed',
    'follow_started','follow_ended',
    'question_published','profile_updated',
    'report_filed','report_resolved'
  )),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN (
    'answer','question','profile','comment','report'
  )),
  target_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON public.activity_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_target ON public.activity_events (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON public.activity_events (event_type, created_at DESC);

-- Content summaries
CREATE TABLE IF NOT EXISTS public.content_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN (
    'answer','question','profile','topic'
  )),
  target_id UUID NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN (
    'one_liner','paragraph','key_points','comparison'
  )),
  body TEXT NOT NULL,
  model TEXT NOT NULL,
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, summary_type)
);
CREATE INDEX IF NOT EXISTS idx_content_summaries_target ON public.content_summaries (target_type, target_id);

-- Backfill answer_count on questions
UPDATE public.questions q SET answer_count = (
  SELECT count(*) FROM public.answers a WHERE a.question_id = q.id AND a.hidden_at IS NULL
);
```

### Phase 2: Enrichment pipeline (script)

```js
// scripts/enrich-answers.mjs
// Run nightly or on-demand: node --env-file=.env.local scripts/enrich-answers.mjs

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic()

const { data: answers } = await supabase
  .from('answers')
  .select('id, body, question:questions(body)')
  .is('summary', null)
  .limit(50)

for (const answer of answers) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Question: ${answer.question.body}\nAnswer: ${answer.body}\n\nReturn JSON:\n{"summary": "1-2 sentence summary", "key_claims": ["claim1", "claim2"], "sentiment": "optimistic|cautious|contrarian|neutral|critical"}`
    }]
  })

  const enrichment = JSON.parse(response.content[0].text)

  await supabase.from('answers').update({
    summary: enrichment.summary,
    key_claims: enrichment.key_claims,
    sentiment: enrichment.sentiment,
    enrichment_version: 1,
  }).eq('id', answer.id)
}
```

### Phase 3: Export API routes

Add `/api/export/answers`, `/api/export/profiles`, `/api/export/questions` — admin-only routes returning denormalized JSON with all enrichment fields included.

### Phase 4: Wire activity events

Add `activity_events` inserts alongside existing operations in server actions:
- `submitAnswer` → `answer_submitted`
- `toggleLike` → `like_given` / `like_removed`
- `postComment` → `comment_posted`
- `toggleFollow` → `follow_started` / `follow_ended`
- `featureAnswer` → `answer_featured`

---

## Summary

| What | Why | Priority |
|------|-----|----------|
| `summary` + `key_claims` on answers | Enables filtering/comparison without reading full bodies | **High** |
| `answer_tags` table | Structured topic labels on answers, not just questions | **High** |
| `activity_events` table | Temporal reasoning, trend analysis | **High** |
| `enrichment_version` on all entities | Track enrichment freshness, support re-runs | **Medium** |
| `content_summaries` table | Separate LLM-generated content from source of truth | **Medium** |
| Profile structured fields | Enable expertise-based queries | **Medium** |
| Export API routes | Clean JSON extraction for agents | **Medium** |
| Comment classification | Understand discussion dynamics | **Low** |
