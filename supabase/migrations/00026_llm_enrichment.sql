-- ============================================================
-- LLM Enrichment Schema
-- Adds structured fields for LLM consumption, answer tags,
-- activity events, and content summaries.
-- ============================================================

-- ============================================================
-- Profile enrichment fields
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seniority_level TEXT CHECK (seniority_level IN (
    'individual_contributor', 'manager', 'director',
    'vp', 'c_suite', 'founder', 'investor', 'advisor'
  )),
  ADD COLUMN IF NOT EXISTS industry TEXT CHECK (industry IN (
    'technology', 'finance', 'healthcare', 'education',
    'media', 'consulting', 'government', 'nonprofit', 'other'
  )),
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Question enrichment fields
-- ============================================================
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS intent_type TEXT CHECK (intent_type IN (
    'opinion', 'experience', 'advice', 'prediction',
    'reflection', 'framework', 'contrarian'
  )),
  ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN (
    'accessible', 'intermediate', 'expert'
  )),
  ADD COLUMN IF NOT EXISTS answer_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Answer enrichment fields
-- ============================================================
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS key_claims TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN (
    'optimistic', 'cautious', 'contrarian', 'neutral', 'critical'
  )),
  ADD COLUMN IF NOT EXISTS quality_score REAL CHECK (quality_score BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Comment enrichment fields
-- ============================================================
ALTER TABLE public.answer_comments
  ADD COLUMN IF NOT EXISTS comment_type TEXT CHECK (comment_type IN (
    'agreement', 'disagreement', 'question',
    'addition', 'experience', 'general'
  )),
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN (
    'positive', 'negative', 'neutral', 'mixed'
  )),
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Answer tags (structured labels with provenance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.answer_tags (
  answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('llm', 'admin', 'author')),
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (answer_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_answer_tags_tag ON public.answer_tags (tag);

-- RLS
ALTER TABLE public.answer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Answer tags are publicly readable"
  ON public.answer_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage answer tags"
  ON public.answer_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Activity events (temporal event log)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_events (
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
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_actor
  ON public.activity_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_target
  ON public.activity_events (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_type
  ON public.activity_events (event_type, created_at DESC);

-- RLS
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity events are publicly readable"
  ON public.activity_events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert activity events"
  ON public.activity_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Content summaries (LLM-generated, separate from source data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN (
    'answer', 'question', 'profile', 'topic'
  )),
  target_id UUID NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN (
    'one_liner', 'paragraph', 'key_points', 'comparison'
  )),
  body TEXT NOT NULL,
  model TEXT NOT NULL,
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, summary_type)
);

CREATE INDEX IF NOT EXISTS idx_content_summaries_target
  ON public.content_summaries (target_type, target_id);

-- RLS
ALTER TABLE public.content_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content summaries are publicly readable"
  ON public.content_summaries FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage content summaries"
  ON public.content_summaries FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Backfill answer_count on questions
-- ============================================================
UPDATE public.questions q SET answer_count = (
  SELECT count(*) FROM public.answers a
  WHERE a.question_id = q.id AND a.hidden_at IS NULL
);
