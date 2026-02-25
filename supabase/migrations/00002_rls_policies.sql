-- ============================================================
-- Enable RLS on all tables (default deny)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Profiles policies
-- ============================================================

-- Anyone can read profiles (public expert pages)
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No direct INSERT from client (trigger handles creation)
-- No DELETE from client (future: account deletion via server action)

-- ============================================================
-- Questions policies
-- ============================================================

-- Public readers see published questions (past and today)
CREATE POLICY "Published questions are publicly readable"
  ON public.questions FOR SELECT
  USING (
    publish_date IS NOT NULL
    AND publish_date <= CURRENT_DATE
    AND status IN ('scheduled', 'published')
  );

-- Admins see all questions (drafts, scheduled, published)
CREATE POLICY "Admins can read all questions"
  ON public.questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert questions
CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update questions
CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete questions
CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- Answers policies
-- ============================================================

-- Anyone can read answers (public feed)
CREATE POLICY "Answers are publicly readable"
  ON public.answers FOR SELECT
  USING (true);

-- Authenticated users can insert their own answers
CREATE POLICY "Users can insert own answers"
  ON public.answers FOR INSERT
  WITH CHECK (auth.uid() = expert_id);

-- Users can update their own answers
CREATE POLICY "Users can update own answers"
  ON public.answers FOR UPDATE
  USING (auth.uid() = expert_id)
  WITH CHECK (auth.uid() = expert_id);

-- Admins can delete any answer (moderation)
CREATE POLICY "Admins can delete answers"
  ON public.answers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
