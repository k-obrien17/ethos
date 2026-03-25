# Credo: LLM-Native Architecture Blueprint

## 1. System Philosophy

### What Credo Is

Credo is a knowledge system where experts commit scarce attention (limited monthly answers) to curated questions. The constraint — you can only answer 3 questions per month — means every answer is a signal about what the expert believes matters most. This makes Credo unusually information-dense compared to platforms with unlimited posting.

### The LLM-Native Premise

Every answer on Credo contains implicit structured knowledge that the current schema discards:

- **Claims** — "Revenue is a lagging indicator" is a falsifiable assertion, not just prose
- **Frameworks** — "I use a 72-hour rule for decisions" is a reusable mental model
- **Evidence** — "I watched three companies lose their engineering teams" is an experience citation
- **Positions** — Two experts disagreeing on remote work is a structured relationship, not just two text blobs
- **Expertise signals** — Which topics an expert chooses to spend their budget on reveals their identity

The current schema stores answers as text. An LLM-native Credo stores answers as **decomposed knowledge objects** with the text as one representation among several.

### Source of Truth Strategy

```
Tier 1: Structured fields (canonical)
  → status, relationships, timestamps, enums, IDs
  → Always queryable, always consistent

Tier 2: Decomposed knowledge (extracted)
  → claims, frameworks, evidence, tags
  → Machine-extracted with provenance, human-reviewable

Tier 3: Narrative text (expression)
  → answer body, bio, comments
  → Rich but not the operational truth

Tier 4: Derived/computed (regenerable)
  → quality scores, summaries, rankings
  → Can be recomputed from Tiers 1-3
```

**Rule:** If two tiers disagree, the higher tier wins. If an answer's `key_claims` field says the expert believes X but the body text is ambiguous, the structured claim is canonical (because a human or model explicitly extracted and confirmed it).

---

## 2. Core Entity Map

### Domain Entities

| Entity | Why First-Class | Current State |
|--------|----------------|---------------|
| **Expert** | The atomic unit of credibility. Everything flows through who said it. | `profiles` — exists but lacks structured expertise model |
| **Question** | The prompt that constrains expert attention. Its framing shapes all answers. | `questions` — exists but lacks intent/difficulty classification |
| **Answer** | The core knowledge artifact. Contains claims, frameworks, evidence. | `answers` — exists as text blob only |
| **Topic** | The taxonomy that organizes knowledge. | `topics` — exists but flat, no hierarchy |
| **Claim** | A discrete, falsifiable assertion extracted from an answer. The atomic unit of knowledge. | **Does not exist** |
| **Framework** | A reusable mental model or decision process described by an expert. | **Does not exist** |
| **Evidence** | A cited experience, data point, or observation supporting a claim. | **Does not exist** |

### Relationship Entities

| Entity | Why First-Class |
|--------|----------------|
| **ExpertiseEdge** | Links an expert to a topic with strength, evidence, and directionality |
| **ClaimRelation** | Links claims that agree, contradict, refine, or extend each other |
| **InfluenceEdge** | Tracks which experts cite, follow, or respond to each other |

### Operational Entities

| Entity | Why First-Class |
|--------|----------------|
| **ModerationAction** | Every hide/feature/report decision is an auditable event |
| **EnrichmentRun** | Tracks what was enriched, by which model, when, with what confidence |
| **ContentReview** | Human review of machine-extracted knowledge (claims, tags, summaries) |

### Knowledge Entities

| Entity | Why First-Class |
|--------|----------------|
| **Insight** | A synthesized observation spanning multiple answers (e.g., "3 of 5 VPs agree that retention predicts revenue") |
| **OpenQuestion** | An unresolved question surfaced by the system or a human |
| **Contradiction** | An explicit disagreement between two experts on a specific claim |

### Communication Entities

| Entity | Why First-Class |
|--------|----------------|
| **Comment** | Already exists — enhance with type, sentiment, and claim linkage |
| **Notification** | Already exists — adequate for current needs |

### Source/Provenance Entities

| Entity | Why First-Class |
|--------|----------------|
| **SourceRef** | Where a fact came from (answer, comment, profile bio, external link) |
| **ChangeRecord** | What changed, when, by whom, why |

---

## 3. Canonical Schemas

### 3.1 Common Envelope

Every entity shares this base shape. Entity-specific fields extend it.

```json
{
  "id": "uuid",
  "entity_type": "expert|question|answer|claim|framework|evidence|topic|...",
  "schema_version": "1",
  "title": "string — human-readable identifier",
  "summary": "string|null — 1-2 sentence description",
  "status": "enum — entity-specific",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "created_by": { "actor_id": "uuid", "actor_type": "human|system|agent|import" },
  "updated_by": { "actor_id": "uuid", "actor_type": "human|system|agent|import" },
  "tags": ["string"],
  "source_ref_ids": ["uuid"],
  "confidence": { "score": 0.0, "label": "low|medium|high" },
  "visibility": "public|unlisted|private|admin_only",
  "enrichment_version": 0,
  "open_questions": ["string"],
  "next_actions": ["string"]
}
```

### 3.2 Expert (extends profiles)

```sql
-- New columns on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  entity_type TEXT NOT NULL DEFAULT 'expert';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  summary TEXT;                          -- "COO and investor focused on org design and scaling"
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  expertise_areas TEXT[] DEFAULT '{}';   -- ['org-design', 'scaling', 'hiring']
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
  canonical_name TEXT;                   -- normalized: "sarah chen"
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  alternate_names TEXT[] DEFAULT '{}';   -- ["Sarah L. Chen", "S. Chen"]
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  external_ids JSONB DEFAULT '{}';       -- {"linkedin": "...", "twitter": "..."}
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  enrichment_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  last_active_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS
  schema_version TEXT NOT NULL DEFAULT '1';
```

**LLM render (compact):**
```json
{
  "id": "550e8400-...",
  "entity_type": "expert",
  "title": "Sarah Chen",
  "summary": "COO and investor, 15yr scaling B2B startups. Focuses on org design, retention as leading indicator, and decision speed.",
  "seniority_level": "c_suite",
  "industry": "technology",
  "expertise_areas": ["org-design", "scaling", "hiring"],
  "stats": { "answer_count": 8, "follower_count": 142, "avg_quality_score": 0.78 },
  "top_claims": ["Retention of top performers predicts company health", "72-hour decision rule filters aligned opportunities"],
  "status": "active"
}
```

**LLM render (standard):**
```json
{
  "id": "550e8400-...",
  "entity_type": "expert",
  "schema_version": "1",
  "title": "Sarah Chen",
  "summary": "COO and investor, 15yr scaling B2B startups. Focuses on org design, retention as leading indicator, and decision speed.",
  "headline": "COO, Meridian Ventures",
  "organization": "Meridian Ventures",
  "bio": "Operator turned investor. 15 years scaling B2B startups from seed to Series C...",
  "seniority_level": "c_suite",
  "industry": "technology",
  "expertise_areas": ["org-design", "scaling", "hiring"],
  "canonical_name": "sarah chen",
  "external_ids": { "linkedin": "sarah-chen-meridian" },
  "stats": {
    "answer_count": 8,
    "follower_count": 142,
    "following_count": 12,
    "answer_limit": 3,
    "avg_quality_score": 0.78,
    "total_likes": 89
  },
  "recent_answers": [
    { "question": "How do you measure success beyond revenue?", "summary": "Tracks retention, decision speed, voluntary surface area as leading indicators", "sentiment": "contrarian", "quality_score": 0.82 }
  ],
  "top_claims": [
    { "text": "Retention of top performers predicts company health", "answer_count": 2, "agreement_count": 3 },
    { "text": "72-hour decision rule filters aligned opportunities", "answer_count": 1 }
  ],
  "relationships": [
    { "type": "expertise_in", "target": "org-design", "strength": "strong", "evidence_count": 4 },
    { "type": "agrees_with", "target_expert": "James Okonkwo", "on_topic": "leading-indicators" }
  ],
  "status": "active",
  "created_at": "2026-01-15T09:00:00Z",
  "updated_at": "2026-03-14T14:30:00Z",
  "last_active_at": "2026-03-12T10:00:00Z",
  "enrichment_version": 2,
  "confidence": { "score": 0.9, "label": "high" },
  "visibility": "public"
}
```

### 3.3 Question

```sql
-- New/modified columns on questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS
  summary TEXT;
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
  answer_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS
  enrichment_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS
  schema_version TEXT NOT NULL DEFAULT '1';
```

**LLM render:**
```json
{
  "id": "7c9e6679-...",
  "entity_type": "question",
  "title": "How do you measure success beyond revenue?",
  "summary": "Asks leaders to identify non-financial metrics that predict company health better than revenue.",
  "intent_type": "framework",
  "difficulty": "intermediate",
  "category": "Leadership",
  "status": "published",
  "publish_date": "2026-02-01",
  "topics": ["leadership", "metrics", "strategy"],
  "stats": { "answer_count": 4, "bookmark_count": 12 },
  "top_claims_across_answers": [
    "Retention predicts revenue (2 experts)",
    "Strategic optionality matters more than P&L (1 expert)"
  ],
  "open_questions": ["No expert has addressed this from a non-tech industry perspective"],
  "enrichment_version": 1
}
```

### 3.4 Answer

```sql
-- New columns on answers
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  summary TEXT;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  key_claims TEXT[] DEFAULT '{}';
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  sentiment TEXT CHECK (sentiment IN (
    'optimistic', 'cautious', 'contrarian', 'neutral', 'critical'
  ));
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  quality_score REAL CHECK (quality_score BETWEEN 0 AND 1);
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  enrichment_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS
  schema_version TEXT NOT NULL DEFAULT '1';
```

**LLM render:**
```json
{
  "id": "a0eebc99-...",
  "entity_type": "answer",
  "title": "Sarah Chen on measuring success beyond revenue",
  "summary": "Revenue lags decisions by 12-18 months. Better leading indicators: top performer retention, time-to-decision, voluntary surface area.",
  "body": "Revenue is a lagging indicator...",
  "expert": { "id": "550e8400-...", "name": "Sarah Chen", "headline": "COO, Meridian Ventures" },
  "question": { "id": "7c9e6679-...", "body": "How do you measure success beyond revenue?" },
  "claims": [
    { "id": "c001-...", "text": "Revenue lags decisions by 12-18 months", "confidence": 0.92, "type": "causal" },
    { "id": "c002-...", "text": "Top performer retention predicts company health", "confidence": 0.88, "type": "predictive" },
    { "id": "c003-...", "text": "Voluntary surface area indicates org vitality", "confidence": 0.85, "type": "diagnostic" }
  ],
  "frameworks": [
    { "id": "f001-...", "name": "Three leading indicators", "components": ["retention", "decision speed", "voluntary initiative"] }
  ],
  "evidence": [
    { "id": "e001-...", "type": "personal_observation", "text": "When those three are healthy, revenue follows", "strength": "anecdotal" }
  ],
  "tags": ["leading-indicators", "retention", "org-health", "metrics"],
  "sentiment": "contrarian",
  "quality_score": 0.82,
  "word_count": 127,
  "stats": { "like_count": 24, "comment_count": 3, "view_count": 891 },
  "status": "visible",
  "featured_at": "2026-02-15T12:00:00Z",
  "created_at": "2026-02-01T14:30:00Z",
  "enrichment_version": 2,
  "confidence": { "score": 0.9, "label": "high" }
}
```

### 3.5 Claim (NEW)

The atomic unit of knowledge in the system.

```sql
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'claim',
  schema_version TEXT NOT NULL DEFAULT '1',

  -- Identity
  text TEXT NOT NULL,                    -- "Revenue lags decisions by 12-18 months"
  normalized_text TEXT NOT NULL,         -- lowercase, trimmed, canonical form
  summary TEXT,                          -- optional shorter form

  -- Classification
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'causal',          -- X causes Y
    'predictive',      -- X predicts Y
    'prescriptive',    -- you should do X
    'descriptive',     -- X is the case
    'evaluative',      -- X is good/bad
    'definitional',    -- X means Y
    'comparative',     -- X > Y
    'experiential'     -- in my experience, X
  )),
  domain TEXT,                           -- 'leadership', 'hiring', etc.
  specificity TEXT CHECK (specificity IN (
    'universal',       -- applies broadly
    'contextual',      -- applies in certain contexts
    'personal'         -- applies to this expert's experience
  )),

  -- Provenance
  source_answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  source_expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  extraction_method TEXT NOT NULL CHECK (extraction_method IN (
    'llm_extracted', 'human_authored', 'human_reviewed', 'imported'
  )),
  extraction_model TEXT,                 -- 'claude-sonnet-4-5-20250514'
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),

  -- Review
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'approved', 'rejected', 'needs_edit'
  )),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  enrichment_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_answer ON public.claims (source_answer_id);
CREATE INDEX idx_claims_expert ON public.claims (source_expert_id);
CREATE INDEX idx_claims_domain ON public.claims (domain);
CREATE INDEX idx_claims_type ON public.claims (claim_type);
CREATE INDEX idx_claims_normalized ON public.claims (normalized_text);
CREATE INDEX idx_claims_review ON public.claims (review_status) WHERE review_status = 'pending';
```

**LLM render:**
```json
{
  "id": "c001-...",
  "entity_type": "claim",
  "text": "Revenue lags decisions by 12-18 months",
  "claim_type": "causal",
  "domain": "leadership",
  "specificity": "universal",
  "source": { "expert": "Sarah Chen", "answer_id": "a0eebc99-...", "question": "How do you measure success beyond revenue?" },
  "confidence": 0.92,
  "extraction_method": "llm_extracted",
  "review_status": "approved",
  "agreement": { "supporting_experts": 2, "contradicting_experts": 0 },
  "related_claims": [
    { "id": "c002-...", "text": "Top performer retention predicts company health", "relation": "supports" }
  ]
}
```

### 3.6 Framework (NEW)

```sql
CREATE TABLE public.frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'framework',
  schema_version TEXT NOT NULL DEFAULT '1',

  -- Identity
  name TEXT NOT NULL,                    -- "Three Leading Indicators"
  summary TEXT NOT NULL,                 -- "Track retention, decision speed, and voluntary initiative instead of revenue"
  description TEXT,                      -- full explanation

  -- Structure
  components TEXT[] DEFAULT '{}',        -- ["retention", "decision speed", "voluntary initiative"]
  use_case TEXT,                         -- "Evaluating company health"
  domain TEXT,

  -- Provenance
  source_answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  source_expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  extraction_method TEXT NOT NULL CHECK (extraction_method IN (
    'llm_extracted', 'human_authored', 'human_reviewed', 'imported'
  )),
  extraction_model TEXT,
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),

  -- Review
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'approved', 'rejected', 'needs_edit'
  )),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,

  tags TEXT[] DEFAULT '{}',
  enrichment_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_frameworks_answer ON public.frameworks (source_answer_id);
CREATE INDEX idx_frameworks_expert ON public.frameworks (source_expert_id);
CREATE INDEX idx_frameworks_domain ON public.frameworks (domain);
```

### 3.7 Evidence (NEW)

```sql
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'evidence',
  schema_version TEXT NOT NULL DEFAULT '1',

  -- Content
  text TEXT NOT NULL,                    -- the evidence statement
  summary TEXT,

  -- Classification
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'personal_experience',  -- "I watched three companies..."
    'case_study',           -- specific named example
    'data_point',           -- a number or metric
    'expert_opinion',       -- "the best leaders I know..."
    'analogy',              -- comparison to another domain
    'counterexample',       -- evidence against a claim
    'citation'              -- reference to external source
  )),
  strength TEXT CHECK (strength IN (
    'anecdotal', 'observational', 'systematic', 'quantitative'
  )),

  -- Links
  supports_claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  source_answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  source_expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Provenance
  extraction_method TEXT NOT NULL CHECK (extraction_method IN (
    'llm_extracted', 'human_authored', 'human_reviewed', 'imported'
  )),
  extraction_model TEXT,
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),

  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'approved', 'rejected', 'needs_edit'
  )),

  enrichment_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_claim ON public.evidence (supports_claim_id);
CREATE INDEX idx_evidence_answer ON public.evidence (source_answer_id);
```

### 3.8 ClaimRelation (NEW)

```sql
CREATE TABLE public.claim_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'claim_relation',

  from_claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  to_claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'supports',        -- from strengthens to
    'contradicts',     -- from opposes to
    'refines',         -- from narrows/specifies to
    'extends',         -- from adds scope to to
    'generalizes',     -- from is a broader version of to
    'exemplifies',     -- from is a specific case of to
    'prerequisite',    -- to requires from
    'alternative'      -- from is an alternative to to
  )),
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  extraction_method TEXT NOT NULL CHECK (extraction_method IN (
    'llm_extracted', 'human_authored', 'human_reviewed'
  )),
  review_status TEXT NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (from_claim_id, to_claim_id, relation_type)
);

CREATE INDEX idx_claim_relations_from ON public.claim_relations (from_claim_id);
CREATE INDEX idx_claim_relations_to ON public.claim_relations (to_claim_id);
CREATE INDEX idx_claim_relations_type ON public.claim_relations (relation_type);
```

### 3.9 ExpertiseEdge (NEW)

```sql
CREATE TABLE public.expertise_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'expertise_edge',

  expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,

  strength TEXT NOT NULL CHECK (strength IN (
    'mentioned',       -- answered 1 question in this area
    'knowledgeable',   -- answered 2-3 with decent quality
    'strong',          -- answered 4+ or high quality scores
    'authoritative'    -- high engagement + featured answers
  )),
  evidence_count INTEGER NOT NULL DEFAULT 0,  -- number of answers in this topic
  avg_quality_score REAL,
  last_answered_at TIMESTAMPTZ,

  -- Computed, not stored
  -- strength is derived from evidence_count + avg_quality_score + featured status

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (expert_id, topic_id)
);

CREATE INDEX idx_expertise_edges_expert ON public.expertise_edges (expert_id);
CREATE INDEX idx_expertise_edges_topic ON public.expertise_edges (topic_id);
CREATE INDEX idx_expertise_edges_strength ON public.expertise_edges (strength);
```

### 3.10 EnrichmentRun (NEW)

```sql
CREATE TABLE public.enrichment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'enrichment_run',

  target_type TEXT NOT NULL,             -- 'answer', 'question', 'profile'
  target_id UUID NOT NULL,
  enrichment_type TEXT NOT NULL,         -- 'claims_extraction', 'summary', 'classification', 'full'
  model TEXT NOT NULL,                   -- 'claude-sonnet-4-5-20250514'
  model_version TEXT,

  status TEXT NOT NULL CHECK (status IN (
    'started', 'completed', 'failed', 'partial'
  )),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,

  results_summary JSONB,                 -- { "claims_extracted": 3, "frameworks_found": 1 }
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrichment_runs_target ON public.enrichment_runs (target_type, target_id);
CREATE INDEX idx_enrichment_runs_status ON public.enrichment_runs (status) WHERE status != 'completed';
```

### 3.11 ChangeRecord (NEW)

```sql
CREATE TABLE public.change_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'change_record',

  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  field_path TEXT NOT NULL,              -- 'summary', 'status', 'quality_score'

  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'updated', 'deleted', 'enriched', 'reviewed', 'merged'
  )),
  old_value TEXT,
  new_value TEXT,

  changed_by UUID,                       -- NULL for system
  changer_type TEXT NOT NULL CHECK (changer_type IN (
    'human', 'system', 'agent', 'enrichment_pipeline'
  )),
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_records_target ON public.change_records (target_type, target_id, created_at DESC);
CREATE INDEX idx_change_records_field ON public.change_records (target_type, field_path);
```

### 3.12 ContentReview (NEW)

```sql
CREATE TABLE public.content_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'content_review',

  target_type TEXT NOT NULL,             -- 'claim', 'framework', 'evidence', 'answer_tag'
  target_id UUID NOT NULL,

  review_action TEXT NOT NULL CHECK (review_action IN (
    'approved', 'rejected', 'edited', 'merged', 'split', 'deferred'
  )),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewer_notes TEXT,

  old_values JSONB,                      -- snapshot before review
  new_values JSONB,                      -- snapshot after review (if edited)

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_reviews_target ON public.content_reviews (target_type, target_id);
CREATE INDEX idx_content_reviews_reviewer ON public.content_reviews (reviewer_id);
```

---

## 4. Relationship Model

### Taxonomy of Relationships

| Relationship | From | To | Stored As |
|---|---|---|---|
| authored | expert | answer | `answers.expert_id` FK |
| answers | answer | question | `answers.question_id` FK |
| categorized_under | question | topic | `question_topics` junction |
| tagged_with | answer | tag | `answer_tags` junction |
| follows_expert | expert | expert | `follows` junction |
| follows_topic | expert | topic | `topic_follows` junction |
| has_expertise_in | expert | topic | `expertise_edges` (weighted) |
| makes_claim | answer | claim | `claims.source_answer_id` FK |
| describes_framework | answer | framework | `frameworks.source_answer_id` FK |
| supports_claim | evidence | claim | `evidence.supports_claim_id` FK |
| relates_to_claim | claim | claim | `claim_relations` (typed edge) |
| liked_by | answer | expert | `answer_likes` junction |
| commented_on | comment | answer | `answer_comments.answer_id` FK |
| bookmarked | expert | question | `bookmarks` junction |
| moderated | admin | answer | `answers.hidden_by` + `change_records` |
| featured | admin | answer | `answers.featured_by` + `change_records` |

### When to Use Edges vs. FKs vs. Junction Tables

**FK (belongs_to):** When the relationship is mandatory, single-valued, and structural.
→ `answers.expert_id`, `claims.source_answer_id`

**Junction table:** When many-to-many and the relationship itself has no properties beyond existence + timestamp.
→ `answer_likes`, `bookmarks`, `follows`

**Dedicated edge table:** When the relationship has properties (strength, type, confidence, temporal bounds).
→ `expertise_edges`, `claim_relations`

---

## 5. Provenance + Evidence Model

### Three Layers of Provenance

**Layer 1: Record-level** — Who created this record and how?
```
created_by: { actor_id, actor_type }
extraction_method: 'llm_extracted' | 'human_authored' | 'human_reviewed' | 'imported'
extraction_model: 'claude-sonnet-4-5-20250514'
```

**Layer 2: Field-level** — Which fields were machine-generated vs human-entered?
```
enrichment_version: 2  (0 = untouched, 1+ = enriched)
review_status: 'pending' | 'approved' | 'rejected'
```

**Layer 3: Fact-level** — For high-value knowledge objects (claims, evidence), full provenance:
```
source_answer_id → which answer contains this claim
source_expert_id → who said it
confidence → how certain is the extraction
extraction_method → how it was extracted
review_status → has a human verified it
```

### Data Type Labels

| Label | Meaning | Trust Level |
|---|---|---|
| `human_authored` | Expert typed this directly | Highest |
| `human_reviewed` | Machine-extracted, human verified | High |
| `llm_extracted` | Machine-extracted, not yet reviewed | Medium |
| `imported` | Brought in from external system | Varies |
| `computed` | Derived from other fields (quality_score) | Regenerable |

---

## 6. Temporal Model

### Required Timestamps by Entity

| Entity | created_at | updated_at | Domain-Specific |
|---|---|---|---|
| Expert | ✓ | ✓ | `last_active_at` |
| Question | ✓ | ✓ | `publish_date` |
| Answer | ✓ | ✓ | `hidden_at`, `featured_at` |
| Claim | ✓ | ✓ | `reviewed_at` |
| Framework | ✓ | ✓ | `reviewed_at` |
| Evidence | ✓ | ✓ | — |
| EnrichmentRun | ✓ | — | `started_at`, `completed_at` |
| ChangeRecord | ✓ | — | — |

### Temporal Queries the System Must Support

- "What has this expert said in the last 90 days?"
- "When was this claim last verified?"
- "What changed since my last session?"
- "Show me the timeline of moderation actions on this answer"
- "Which enrichments are stale (>30 days old)?"

### History via ChangeRecords

Rather than versioning entire rows, track meaningful field changes:

```json
{
  "target_type": "answer",
  "target_id": "a0eebc99-...",
  "field_path": "summary",
  "change_type": "enriched",
  "old_value": null,
  "new_value": "Revenue lags decisions by 12-18 months...",
  "changer_type": "enrichment_pipeline",
  "reason": "Initial enrichment run",
  "created_at": "2026-03-14T10:00:00Z"
}
```

---

## 7. Deduplication + Identity Model

### Expert Deduplication

Experts are created via auth signup, so identity is tied to email. The risk is external references — the same person mentioned in different answers by slightly different names.

```
canonical_name: "sarah chen"           -- lowercased, normalized
display_name: "Sarah Chen"             -- as they set it
alternate_names: ["Sarah L. Chen"]     -- known variants
external_ids: { "linkedin": "..." }    -- cross-system links
```

### Claim Deduplication

Two experts may make essentially the same claim in different words. The `normalized_text` field on claims enables fuzzy matching:

```
text: "Revenue is a lagging indicator"
normalized_text: "revenue is a lagging indicator"

text: "Revenue lags behind decisions"
normalized_text: "revenue lags behind decisions"
```

These are semantically similar but textually different. The system should:
1. Store both as separate claims with their own provenance
2. Link them via `claim_relations` with `relation_type: 'generalizes'` or `'supports'`
3. Surface them as a cluster in the LLM render model

### Topic Deduplication

Add `parent_topic_id` to enable hierarchy:

```sql
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS
  parent_topic_id UUID REFERENCES public.topics(id);
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS
  aliases TEXT[] DEFAULT '{}';
```

---

## 8. Change History + Audit Model

### What Gets Logged

| Event | Logged Via |
|---|---|
| Answer submitted | `activity_events` + `change_records` |
| Answer edited | `change_records` (field-level diff) |
| Answer hidden/unhidden | `change_records` + `activity_events` |
| Answer featured/unfeatured | `change_records` + `activity_events` |
| Claim extracted | `enrichment_runs` + `change_records` |
| Claim reviewed | `content_reviews` + `change_records` |
| Profile enriched | `enrichment_runs` + `change_records` |
| Like/unlike | `activity_events` |
| Follow/unfollow | `activity_events` |
| Comment posted | `activity_events` |

### Audit Query Examples

```sql
-- "What happened to this answer?"
SELECT * FROM change_records
WHERE target_type = 'answer' AND target_id = ?
ORDER BY created_at;

-- "What has this enrichment pipeline done today?"
SELECT target_type, count(*), avg(cost_usd)
FROM enrichment_runs
WHERE created_at > now() - interval '1 day'
GROUP BY target_type;

-- "Which claims need human review?"
SELECT c.*, a.body as answer_body, p.display_name as expert
FROM claims c
JOIN answers a ON c.source_answer_id = a.id
JOIN profiles p ON c.source_expert_id = p.id
WHERE c.review_status = 'pending'
ORDER BY c.confidence DESC;
```

---

## 9. LLM Render Model

### Three Resolution Levels

**Compact** (~100 tokens per record)
Use for: list views, search results, context packing when budget is tight
```json
{
  "id": "a0eebc99-...",
  "type": "answer",
  "title": "Sarah Chen on measuring success",
  "summary": "Revenue lags decisions. Track retention, decision speed, voluntary initiative.",
  "quality": 0.82,
  "sentiment": "contrarian",
  "claims": 3,
  "likes": 24
}
```

**Standard** (~300-500 tokens per record)
Use for: context injection into working prompts, meeting prep, dossier assembly
Includes: full summary, top claims, key relationships, stats, provenance indicators

**Expanded** (~800-1500 tokens per record)
Use for: deep analysis, full audit, decision support
Includes: full body text, all claims with evidence, complete relationship graph, change history, enrichment metadata

### Token Budget Rules

```
Budget < 2000 tokens: compact only, max 20 records
Budget 2000-8000: standard for focus entity, compact for related
Budget 8000-32000: standard for all, expanded for focus
Budget > 32000: expanded for focus, standard for context
```

### Context Package Templates

**Expert Dossier:**
```
1. Expert profile (standard)
2. Top 5 answers (compact)
3. Top 10 claims (compact)
4. Expertise edges (all)
5. Key contradictions with other experts (compact)
6. Recent activity (5 events)
```

**Question Analysis:**
```
1. Question (standard)
2. All answers (standard)
3. Claims extracted across all answers (full)
4. Claim relations (agreements, contradictions)
5. Coverage gaps (which perspectives are missing)
```

**Topic Brief:**
```
1. Topic (standard)
2. Top experts by expertise_edge strength (compact, top 10)
3. Top claims in this domain (compact, top 20)
4. Key frameworks (standard)
5. Open contradictions
6. Unanswered questions
```

---

## 10. Agent Write Safety Model

### Field Protection Levels

| Level | Fields | Agent Can |
|---|---|---|
| **Immutable** | `id`, `created_at`, `created_by`, `entity_type` | Never modify |
| **Protected** | `body` (answer text), `role`, `answer_limit`, `hidden_at` | Only with human approval |
| **Enrichable** | `summary`, `key_claims`, `sentiment`, `quality_score`, `tags` | Write freely, provenance tracked |
| **Computed** | `like_count`, `follower_count`, `answer_count` | Only via defined operations |

### Agent Write Flow

```
1. Agent proposes change
   → INSERT INTO change_records (change_type: 'proposed', changer_type: 'agent')

2. System checks field protection level
   → Enrichable: auto-apply, log in change_records
   → Protected: queue for human review in content_reviews

3. If auto-applied:
   → UPDATE target record
   → INSERT INTO change_records (change_type: 'enriched')
   → INSERT INTO enrichment_runs (status: 'completed')

4. If queued:
   → INSERT INTO content_reviews (review_action: null, status: 'pending')
   → Human reviews in admin panel
   → On approval: apply change, log in change_records
```

### Rollback

Every enrichment change has a `change_record` with `old_value`. To rollback:

```sql
-- Rollback a specific enrichment
UPDATE answers SET summary = cr.old_value
FROM change_records cr
WHERE cr.target_id = answers.id
  AND cr.field_path = 'summary'
  AND cr.id = ?;
```

---

## 11. Export + Interoperability Model

### Export Endpoints

```
GET /api/export/experts?since=&format=json&resolution=standard
GET /api/export/answers?since=&topic=&format=json&resolution=compact
GET /api/export/claims?domain=&min_confidence=0.8&format=json
GET /api/export/knowledge-graph?center=expert:123&depth=2&format=json
```

### Export Format

```json
{
  "export_meta": {
    "exported_at": "2026-03-18T10:00:00Z",
    "schema_version": "1",
    "entity_count": 42,
    "resolution": "standard",
    "filters_applied": { "since": "2026-03-01" }
  },
  "entities": [ ... ]
}
```

### Schema Versioning

Every entity carries `schema_version`. When the schema changes:

1. Bump `schema_version` on new records
2. Export includes version per record
3. Consumers can handle multiple versions
4. Migration script upgrades old records when ready

---

## 12. Example Records

### Core Domain Entity — Answer

```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "entity_type": "answer",
  "schema_version": "1",
  "title": "Sarah Chen on measuring success beyond revenue",
  "summary": "Revenue lags decisions by 12-18 months. Better leading indicators: top performer retention, time-to-decision, voluntary surface area.",
  "body": "Revenue is a lagging indicator. By the time it shows up, the decisions that caused it are 12-18 months old.\n\nThe metrics I actually watch: retention of top performers, time-to-decision, and voluntary surface area.\n\nWhen those three are healthy, revenue follows. When they're not, no amount of sales optimization saves you.",
  "status": "visible",
  "sentiment": "contrarian",
  "quality_score": 0.82,
  "word_count": 127,
  "expert": { "id": "550e8400-...", "name": "Sarah Chen", "headline": "COO, Meridian Ventures" },
  "question": { "id": "7c9e6679-...", "body": "How do you measure success beyond revenue?", "intent_type": "framework" },
  "tags": ["leading-indicators", "retention", "org-health"],
  "stats": { "like_count": 24, "comment_count": 3, "view_count": 891 },
  "featured_at": "2026-02-15T12:00:00Z",
  "created_at": "2026-02-01T14:30:00Z",
  "updated_at": "2026-02-15T12:00:00Z",
  "created_by": { "actor_id": "550e8400-...", "actor_type": "human" },
  "enrichment_version": 2,
  "confidence": { "score": 0.9, "label": "high" },
  "visibility": "public"
}
```

### Relationship Object — ClaimRelation

```json
{
  "id": "cr-001-...",
  "entity_type": "claim_relation",
  "from_claim": {
    "id": "c001-...",
    "text": "Revenue lags decisions by 12-18 months",
    "expert": "Sarah Chen"
  },
  "to_claim": {
    "id": "c010-...",
    "text": "Strategic optionality matters more than P&L results",
    "expert": "James Okonkwo"
  },
  "relation_type": "supports",
  "confidence": 0.78,
  "extraction_method": "llm_extracted",
  "review_status": "pending",
  "created_at": "2026-03-14T10:00:00Z"
}
```

### Decision Object — ContentReview

```json
{
  "id": "rev-001-...",
  "entity_type": "content_review",
  "target_type": "claim",
  "target_id": "c001-...",
  "review_action": "approved",
  "reviewer_id": "admin-001-...",
  "reviewer_notes": "Accurately captures the expert's core argument. Confidence bumped from 0.85 to 0.92.",
  "old_values": { "confidence": 0.85, "review_status": "pending" },
  "new_values": { "confidence": 0.92, "review_status": "approved" },
  "created_at": "2026-03-15T11:00:00Z"
}
```

### Task/Action Object — EnrichmentRun

```json
{
  "id": "er-001-...",
  "entity_type": "enrichment_run",
  "target_type": "answer",
  "target_id": "a0eebc99-...",
  "enrichment_type": "full",
  "model": "claude-sonnet-4-5-20250514",
  "status": "completed",
  "started_at": "2026-03-14T10:00:00Z",
  "completed_at": "2026-03-14T10:00:03Z",
  "input_tokens": 450,
  "output_tokens": 280,
  "cost_usd": 0.003,
  "results_summary": {
    "claims_extracted": 3,
    "frameworks_found": 1,
    "evidence_found": 1,
    "summary_generated": true,
    "sentiment_classified": true,
    "tags_applied": 3
  }
}
```

### Source/Evidence Object

```json
{
  "id": "e001-...",
  "entity_type": "evidence",
  "text": "When those three are healthy, revenue follows. When they're not, no amount of sales optimization saves you.",
  "evidence_type": "personal_observation",
  "strength": "anecdotal",
  "supports_claim": {
    "id": "c002-...",
    "text": "Top performer retention predicts company health"
  },
  "source": {
    "answer_id": "a0eebc99-...",
    "expert": "Sarah Chen"
  },
  "confidence": 0.80,
  "extraction_method": "llm_extracted",
  "review_status": "pending",
  "created_at": "2026-03-14T10:00:00Z"
}
```

### Change History Object

```json
{
  "id": "ch-001-...",
  "entity_type": "change_record",
  "target_type": "answer",
  "target_id": "a0eebc99-...",
  "field_path": "summary",
  "change_type": "enriched",
  "old_value": null,
  "new_value": "Revenue lags decisions by 12-18 months. Better leading indicators: top performer retention, time-to-decision, voluntary surface area.",
  "changed_by": null,
  "changer_type": "enrichment_pipeline",
  "reason": "Initial enrichment via claude-sonnet-4-5-20250514",
  "created_at": "2026-03-14T10:00:00Z"
}
```

---

## 13. Anti-Patterns to Avoid

1. **Prose as database.** An answer body that says "I track three things: retention, speed, initiative" contains three claims, a framework, and evidence — none of which are queryable until extracted. Never treat prose as the source of truth for operational knowledge.

2. **Flat tags without provenance.** A tag `["leadership"]` on an answer is worthless without knowing: who applied it, when, with what confidence, and whether it was verified. Tags without provenance are noise.

3. **Enrichment without versioning.** If you enrich an answer with Claude Sonnet today and Claude Opus next month, you need to know which model produced which fields. Without `enrichment_version` and `enrichment_runs`, you can't re-enrich or debug.

4. **Claims buried in summaries.** A summary that says "the expert believes retention matters" is not a queryable claim. Claims must be separate objects with their own IDs, provenance, and relationships.

5. **Relationships as UI affordances only.** "Sarah follows James" is a knowledge graph edge, not just a button state. If you only store it for the UI and don't expose it to agents, you lose the social graph.

6. **Single-resolution rendering.** Returning the full 800-token answer body when an agent only needs a 50-token summary wastes context budget. Always support compact/standard/expanded.

7. **Agent writes without audit trail.** If an agent updates `quality_score` from 0.6 to 0.8, and there's no `change_record`, you've lost the ability to debug or rollback. Every machine write must be traceable.

8. **Mixing human and machine confidence.** A claim an expert explicitly stated (confidence: 0.95) and a claim an LLM inferred from vague phrasing (confidence: 0.4) should never have the same trust level. Mark extraction_method and confidence separately.

9. **No deduplication strategy for claims.** Two experts saying "retention matters" in different words creates two claim objects. Without a relation linking them (`supports` or `generalizes`), the system treats them as unrelated knowledge. Always surface semantic clusters.

10. **Temporal blindness.** An answer from 2 years ago and one from yesterday have different freshness. A claim reviewed last week and one never reviewed have different trust. Without explicit temporal metadata, agents can't reason about relevance or staleness.

---

## 14. Implementation Recommendations

### Phase 1: Schema Foundation (Migration 00027)

Apply the migration that adds:
- Enrichment columns on profiles, questions, answers, comments
- `claims` table
- `frameworks` table
- `evidence` table
- `claim_relations` table
- `expertise_edges` table
- `enrichment_runs` table
- `change_records` table
- `content_reviews` table

Use the existing `answer_tags`, `activity_events`, `content_summaries` tables from migration 00026.

### Phase 2: Enrichment Pipeline v2

Upgrade `enrichAnswer()` in `src/lib/enrichment.js` to:
1. Extract claims as separate `claims` table rows
2. Extract frameworks as separate `frameworks` table rows
3. Extract evidence as separate `evidence` table rows
4. Log each run in `enrichment_runs`
5. Log field changes in `change_records`
6. Compute and update `expertise_edges` for the expert

### Phase 3: Claim Relations Pipeline

After claims accumulate:
1. Batch job compares claims pairwise within same topic
2. Uses LLM to classify relation type (supports/contradicts/refines)
3. Stores in `claim_relations` with confidence
4. Surfaces contradictions and agreements in the knowledge graph

### Phase 4: Export API

Build `/api/export/` routes with:
- `resolution` parameter (compact/standard/expanded)
- `since` parameter for incremental sync
- `format` parameter (json, jsonl)
- Admin-only auth
- Schema version in response envelope

### Phase 5: Admin Review Interface

Build `/admin/reviews` page for:
- Pending claim reviews (approve/reject/edit)
- Pending framework reviews
- Enrichment run dashboard
- Change history viewer
- Claim relation graph visualization

### Phase 6: Context Package API

Build `/api/context/` routes that assemble context packages:
- `/api/context/expert-dossier/:id`
- `/api/context/question-analysis/:id`
- `/api/context/topic-brief/:slug`
- `/api/context/recent-changes?since=`

Each returns a pre-assembled, token-budget-aware JSON document ready for LLM context injection.

### Indexing Strategy

Add to existing search infrastructure:
```sql
-- Claims full-text search
ALTER TABLE public.claims ADD COLUMN search_vector tsvector;
CREATE INDEX idx_claims_search ON public.claims USING gin(search_vector);

-- Trigger to keep it updated
CREATE TRIGGER claims_search_vector_trigger
  BEFORE INSERT OR UPDATE OF text ON public.claims
  FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', text);
```

### Cost Management

Enrichment costs scale with content volume. Budget controls:
- Track `cost_usd` per `enrichment_run`
- Set daily/monthly cost caps in `site_settings`
- Use compact models (Haiku) for classification, larger models for extraction
- Skip re-enrichment if `enrichment_version` is current and `updated_at` hasn't changed

---

## Summary

Credo is not a blog with comments. It's a **knowledge graph where experts commit scarce credibility to structured positions on important questions.** Every answer decomposes into claims, frameworks, and evidence. Every expert's pattern of answers reveals their expertise topology. Every agreement or contradiction between experts is a queryable relationship.

The current schema stores text. This architecture stores **decomposed, attributed, versioned, reviewable knowledge** that LLMs can traverse, reason over, and act on — while humans continue to see a clean, simple Q&A interface.

The UI stays simple. The data model becomes a knowledge engine.
