-- ============================================================
-- Profiles table (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  answer_limit INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Questions table (curated by editorial team)
-- ============================================================
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  publish_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Answers table (the core content)
-- ============================================================
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Unique constraints
-- ============================================================
-- One answer per expert per question
CREATE UNIQUE INDEX idx_answers_expert_question ON public.answers (expert_id, question_id);

-- Profile handle uniqueness (already UNIQUE on column, index for lookups)
CREATE INDEX idx_profiles_handle ON public.profiles (handle);

-- Question slug uniqueness (already UNIQUE on column, index for lookups)
CREATE INDEX idx_questions_slug ON public.questions (slug);

-- ============================================================
-- Performance indexes
-- ============================================================
-- Question feed: published questions ordered by date
CREATE INDEX idx_questions_publish_date ON public.questions (publish_date DESC)
  WHERE publish_date IS NOT NULL;

-- Answers by question (question page feed)
CREATE INDEX idx_answers_question ON public.answers (question_id, created_at DESC);

-- Answers by expert (expert profile feed)
CREATE INDEX idx_answers_expert ON public.answers (expert_id, created_at DESC);

-- Monthly answer limit check
CREATE INDEX idx_answers_expert_month ON public.answers (expert_id, created_at);

-- ============================================================
-- Auto-create profile on signup trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_handle TEXT;
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract display name from OAuth metadata
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract avatar from OAuth metadata
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- Generate handle from name (lowercase, hyphens, no special chars)
  v_handle := lower(regexp_replace(
    regexp_replace(v_display_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));

  -- Append random suffix to ensure uniqueness
  v_handle := v_handle || '-' || substr(gen_random_uuid()::text, 1, 4);

  INSERT INTO public.profiles (id, handle, display_name, avatar_url)
  VALUES (NEW.id, v_handle, v_display_name, v_avatar_url);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER answers_updated_at
  BEFORE UPDATE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
