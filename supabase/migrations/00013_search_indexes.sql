-- Full-text search support for Phase 11: Search
-- Adds tsvector columns, GIN indexes, trigger functions, backfill, and
-- a unified search_content RPC for querying questions, answers, and profiles.

-- ============================================================
-- 1. Add tsvector columns
-- ============================================================

-- Questions: search on body + category
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Answers: search on body
ALTER TABLE public.answers ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Profiles: search on display_name + handle + bio + headline + organization
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- ============================================================
-- 2. Create GIN indexes for fast full-text search
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_questions_search ON public.questions USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_answers_search ON public.answers USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles USING GIN (search_vector);

-- ============================================================
-- 3. Trigger functions to auto-update search_vector on insert/update
-- ============================================================

-- Questions trigger function
CREATE OR REPLACE FUNCTION questions_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_search_vector_trigger
  BEFORE INSERT OR UPDATE OF body, category ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION questions_search_vector_update();

-- Answers trigger function
CREATE OR REPLACE FUNCTION answers_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.body, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER answers_search_vector_trigger
  BEFORE INSERT OR UPDATE OF body ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION answers_search_vector_update();

-- Profiles trigger function
CREATE OR REPLACE FUNCTION profiles_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.handle, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.headline, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.organization, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_search_vector_trigger
  BEFORE INSERT OR UPDATE OF display_name, handle, bio, headline, organization ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_search_vector_update();

-- ============================================================
-- 4. Backfill existing rows
-- ============================================================

UPDATE public.questions SET search_vector =
  setweight(to_tsvector('english', COALESCE(body, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'B');

UPDATE public.answers SET search_vector =
  to_tsvector('english', COALESCE(body, ''));

UPDATE public.profiles SET search_vector =
  setweight(to_tsvector('english', COALESCE(display_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(handle, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(headline, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(organization, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(bio, '')), 'C');

-- ============================================================
-- 5. Unified search RPC function
-- ============================================================

CREATE OR REPLACE FUNCTION search_content(
  search_query TEXT,
  filter_type TEXT DEFAULT NULL,
  filter_topic_id UUID DEFAULT NULL,
  filter_date_range TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 20,
  result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  result_id UUID,
  result_type TEXT,
  title TEXT,
  snippet TEXT,
  url TEXT,
  topic_names TEXT[],
  author_name TEXT,
  author_handle TEXT,
  author_avatar TEXT,
  published_date TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ts_query tsquery;
  date_cutoff TIMESTAMPTZ;
BEGIN
  -- Parse the search query into a tsquery (supports Google-like syntax)
  ts_query := websearch_to_tsquery('english', search_query);

  -- Calculate date cutoff
  IF filter_date_range = 'week' THEN
    date_cutoff := now() - INTERVAL '7 days';
  ELSIF filter_date_range = 'month' THEN
    date_cutoff := now() - INTERVAL '1 month';
  ELSIF filter_date_range = '3months' THEN
    date_cutoff := now() - INTERVAL '3 months';
  ELSIF filter_date_range = 'year' THEN
    date_cutoff := now() - INTERVAL '1 year';
  ELSE
    date_cutoff := NULL;
  END IF;

  RETURN QUERY

  -- Questions
  SELECT
    q.id AS result_id,
    'question'::TEXT AS result_type,
    q.body AS title,
    ts_headline('english', q.body, ts_query, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=40, MinWords=20') AS snippet,
    '/q/' || q.slug AS url,
    COALESCE(ARRAY(
      SELECT t.name FROM public.question_topics qt
      JOIN public.topics t ON t.id = qt.topic_id
      WHERE qt.question_id = q.id
    ), '{}'::TEXT[]) AS topic_names,
    NULL::TEXT AS author_name,
    NULL::TEXT AS author_handle,
    NULL::TEXT AS author_avatar,
    q.publish_date::TIMESTAMPTZ AS published_date,
    ts_rank(q.search_vector, ts_query) AS rank
  FROM public.questions q
  WHERE q.search_vector @@ ts_query
    AND q.status IN ('scheduled', 'published')
    AND q.publish_date <= CURRENT_DATE
    AND (filter_type IS NULL OR filter_type = 'question')
    AND (filter_topic_id IS NULL OR EXISTS (
      SELECT 1 FROM public.question_topics qt
      WHERE qt.question_id = q.id AND qt.topic_id = filter_topic_id
    ))
    AND (date_cutoff IS NULL OR q.publish_date::TIMESTAMPTZ >= date_cutoff)

  UNION ALL

  -- Answers
  SELECT
    a.id AS result_id,
    'answer'::TEXT AS result_type,
    aq.body AS title,
    ts_headline('english', a.body, ts_query, 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=40, MinWords=20') AS snippet,
    '/answers/' || a.id AS url,
    COALESCE(ARRAY(
      SELECT t.name FROM public.question_topics qt
      JOIN public.topics t ON t.id = qt.topic_id
      WHERE qt.question_id = a.question_id
    ), '{}'::TEXT[]) AS topic_names,
    ap.display_name AS author_name,
    ap.handle AS author_handle,
    ap.avatar_url AS author_avatar,
    a.created_at AS published_date,
    ts_rank(a.search_vector, ts_query) AS rank
  FROM public.answers a
  JOIN public.questions aq ON aq.id = a.question_id
  JOIN public.profiles ap ON ap.id = a.expert_id
  WHERE a.search_vector @@ ts_query
    AND aq.status IN ('scheduled', 'published')
    AND (filter_type IS NULL OR filter_type = 'answer')
    AND (filter_topic_id IS NULL OR EXISTS (
      SELECT 1 FROM public.question_topics qt
      WHERE qt.question_id = a.question_id AND qt.topic_id = filter_topic_id
    ))
    AND (date_cutoff IS NULL OR a.created_at >= date_cutoff)
    AND a.hidden_at IS NULL

  UNION ALL

  -- Expert profiles
  SELECT
    p.id AS result_id,
    'expert'::TEXT AS result_type,
    p.display_name AS title,
    ts_headline('english',
      COALESCE(p.headline, '') || ' ' || COALESCE(p.bio, ''),
      ts_query,
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=30, MinWords=15'
    ) AS snippet,
    '/expert/' || p.handle AS url,
    '{}'::TEXT[] AS topic_names,
    p.display_name AS author_name,
    p.handle AS author_handle,
    p.avatar_url AS author_avatar,
    p.created_at AS published_date,
    ts_rank(p.search_vector, ts_query) AS rank
  FROM public.profiles p
  WHERE p.search_vector @@ ts_query
    AND (filter_type IS NULL OR filter_type = 'expert')
    AND (date_cutoff IS NULL OR p.created_at >= date_cutoff)

  ORDER BY rank DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;
