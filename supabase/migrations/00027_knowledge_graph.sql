-- ============================================================
-- Knowledge Graph Schema
-- Decomposes answers into claims, frameworks, and evidence.
-- Adds relationship tracking, enrichment auditing, and
-- change history for LLM-native knowledge consumption.
-- ============================================================

-- ============================================================
-- Profile enhancements (identity + deduplication)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'expert',
  ADD COLUMN IF NOT EXISTS canonical_name TEXT,
  ADD COLUMN IF NOT EXISTS alternate_names TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schema_version TEXT NOT NULL DEFAULT '1';

-- Backfill canonical_name from display_name
UPDATE public.profiles SET canonical_name = lower(display_name)
WHERE canonical_name IS NULL;

-- ============================================================
-- Question enhancements
-- ============================================================
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS schema_version TEXT NOT NULL DEFAULT '1';

-- ============================================================
-- Answer enhancements
-- ============================================================
ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS schema_version TEXT NOT NULL DEFAULT '1';

-- ============================================================
-- Topic enhancements (hierarchy + aliases)
-- ============================================================
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS parent_topic_id UUID REFERENCES public.topics(id),
  ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}';

-- ============================================================
-- Claims — atomic unit of knowledge
-- ============================================================
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'claim',
  schema_version TEXT NOT NULL DEFAULT '1',

  -- Identity
  text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  summary TEXT,

  -- Classification
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'causal',
    'predictive',
    'prescriptive',
    'descriptive',
    'evaluative',
    'definitional',
    'comparative',
    'experiential'
  )),
  domain TEXT,
  specificity TEXT CHECK (specificity IN (
    'universal', 'contextual', 'personal'
  )),

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
CREATE INDEX idx_claims_review ON public.claims (review_status)
  WHERE review_status = 'pending';

-- Full-text search on claims
ALTER TABLE public.claims ADD COLUMN search_vector tsvector;
CREATE INDEX idx_claims_search ON public.claims USING gin(search_vector);

CREATE OR REPLACE FUNCTION public.claims_search_vector_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER claims_search_vector_trigger
  BEFORE INSERT OR UPDATE OF text ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.claims_search_vector_update();

CREATE TRIGGER claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Claims are publicly readable"
  ON public.claims FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert claims"
  ON public.claims FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage claims"
  ON public.claims FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Frameworks — reusable mental models
-- ============================================================
CREATE TABLE public.frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'framework',
  schema_version TEXT NOT NULL DEFAULT '1',

  -- Identity
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,

  -- Structure
  components TEXT[] DEFAULT '{}',
  use_case TEXT,
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

CREATE TRIGGER frameworks_updated_at
  BEFORE UPDATE ON public.frameworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Frameworks are publicly readable"
  ON public.frameworks FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert frameworks"
  ON public.frameworks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage frameworks"
  ON public.frameworks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Evidence — supporting observations and data
-- ============================================================
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'evidence',
  schema_version TEXT NOT NULL DEFAULT '1',

  -- Content
  text TEXT NOT NULL,
  summary TEXT,

  -- Classification
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'personal_experience',
    'case_study',
    'data_point',
    'expert_opinion',
    'analogy',
    'counterexample',
    'citation'
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
CREATE INDEX idx_evidence_expert ON public.evidence (source_expert_id);
CREATE INDEX idx_evidence_type ON public.evidence (evidence_type);

CREATE TRIGGER evidence_updated_at
  BEFORE UPDATE ON public.evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Evidence is publicly readable"
  ON public.evidence FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert evidence"
  ON public.evidence FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage evidence"
  ON public.evidence FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Claim relations — edges between claims
-- ============================================================
CREATE TABLE public.claim_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'claim_relation',

  from_claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  to_claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'supports',
    'contradicts',
    'refines',
    'extends',
    'generalizes',
    'exemplifies',
    'prerequisite',
    'alternative'
  )),
  confidence REAL CHECK (confidence BETWEEN 0 AND 1),
  extraction_method TEXT NOT NULL CHECK (extraction_method IN (
    'llm_extracted', 'human_authored', 'human_reviewed'
  )),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'approved', 'rejected'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (from_claim_id, to_claim_id, relation_type)
);

CREATE INDEX idx_claim_relations_from ON public.claim_relations (from_claim_id);
CREATE INDEX idx_claim_relations_to ON public.claim_relations (to_claim_id);
CREATE INDEX idx_claim_relations_type ON public.claim_relations (relation_type);

-- RLS
ALTER TABLE public.claim_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Claim relations are publicly readable"
  ON public.claim_relations FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert claim relations"
  ON public.claim_relations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage claim relations"
  ON public.claim_relations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Expertise edges — weighted expert-topic links
-- ============================================================
CREATE TABLE public.expertise_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'expertise_edge',

  expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,

  strength TEXT NOT NULL CHECK (strength IN (
    'mentioned', 'knowledgeable', 'strong', 'authoritative'
  )),
  evidence_count INTEGER NOT NULL DEFAULT 0,
  avg_quality_score REAL,
  last_answered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (expert_id, topic_id)
);

CREATE INDEX idx_expertise_edges_expert ON public.expertise_edges (expert_id);
CREATE INDEX idx_expertise_edges_topic ON public.expertise_edges (topic_id);
CREATE INDEX idx_expertise_edges_strength ON public.expertise_edges (strength);

CREATE TRIGGER expertise_edges_updated_at
  BEFORE UPDATE ON public.expertise_edges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.expertise_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expertise edges are publicly readable"
  ON public.expertise_edges FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert expertise edges"
  ON public.expertise_edges FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage expertise edges"
  ON public.expertise_edges FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- Enrichment runs — audit trail for pipeline operations
-- ============================================================
CREATE TABLE public.enrichment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'enrichment_run',

  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  enrichment_type TEXT NOT NULL,
  model TEXT NOT NULL,
  model_version TEXT,

  status TEXT NOT NULL CHECK (status IN (
    'started', 'completed', 'failed', 'partial'
  )),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd REAL,

  results_summary JSONB,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrichment_runs_target ON public.enrichment_runs (target_type, target_id);
CREATE INDEX idx_enrichment_runs_status ON public.enrichment_runs (status)
  WHERE status != 'completed';
CREATE INDEX idx_enrichment_runs_created ON public.enrichment_runs (created_at DESC);

-- RLS (service role / admin only)
ALTER TABLE public.enrichment_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read enrichment runs"
  ON public.enrichment_runs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can insert enrichment runs"
  ON public.enrichment_runs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Change records — field-level audit trail
-- ============================================================
CREATE TABLE public.change_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'change_record',

  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  field_path TEXT NOT NULL,

  change_type TEXT NOT NULL CHECK (change_type IN (
    'created', 'updated', 'deleted', 'enriched', 'reviewed', 'merged'
  )),
  old_value TEXT,
  new_value TEXT,

  changed_by UUID,
  changer_type TEXT NOT NULL CHECK (changer_type IN (
    'human', 'system', 'agent', 'enrichment_pipeline'
  )),
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_records_target ON public.change_records (target_type, target_id, created_at DESC);
CREATE INDEX idx_change_records_field ON public.change_records (target_type, field_path);
CREATE INDEX idx_change_records_created ON public.change_records (created_at DESC);

-- RLS
ALTER TABLE public.change_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read change records"
  ON public.change_records FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can insert change records"
  ON public.change_records FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Content reviews — human review of machine-extracted knowledge
-- ============================================================
CREATE TABLE public.content_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'content_review',

  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,

  review_action TEXT NOT NULL CHECK (review_action IN (
    'approved', 'rejected', 'edited', 'merged', 'split', 'deferred'
  )),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  reviewer_notes TEXT,

  old_values JSONB,
  new_values JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_reviews_target ON public.content_reviews (target_type, target_id);
CREATE INDEX idx_content_reviews_reviewer ON public.content_reviews (reviewer_id);

-- RLS
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage content reviews"
  ON public.content_reviews FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
