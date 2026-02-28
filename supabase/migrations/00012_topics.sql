-- ============================================================
-- Topics taxonomy: topics, question_topics junction, topic_follows
-- ============================================================

-- Topics table: admin-managed taxonomy
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_topics_slug ON public.topics (slug);

-- Junction table: many-to-many questions <-> topics (max 3 per question)
CREATE TABLE public.question_topics (
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, topic_id)
);

CREATE INDEX idx_question_topics_topic_id ON public.question_topics (topic_id);

-- Enforce max 3 topics per question
CREATE OR REPLACE FUNCTION check_question_topic_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.question_topics WHERE question_id = NEW.question_id) >= 3 THEN
    RAISE EXCEPTION 'A question can have at most 3 topics';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_question_topic_limit
  BEFORE INSERT ON public.question_topics
  FOR EACH ROW
  EXECUTE FUNCTION check_question_topic_limit();

-- Topic follows: users can follow topics (used by plan 10-02)
CREATE TABLE public.topic_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

CREATE INDEX idx_topic_follows_topic_id ON public.topic_follows (topic_id);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Topics: publicly readable, admin-managed
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topics are publicly readable"
  ON public.topics FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert topics"
  ON public.topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update topics"
  ON public.topics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete topics"
  ON public.topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Question topics: publicly readable, admin-managed
ALTER TABLE public.question_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Question topics are publicly readable"
  ON public.question_topics FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert question topics"
  ON public.question_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete question topics"
  ON public.question_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Topic follows: publicly readable, user self-managed
ALTER TABLE public.topic_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topic follows are publicly readable"
  ON public.topic_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow topics"
  ON public.topic_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow topics"
  ON public.topic_follows FOR DELETE
  USING (auth.uid() = user_id);
