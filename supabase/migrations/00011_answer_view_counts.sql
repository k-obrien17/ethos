-- ============================================================
-- Answer view counts — author-only engagement metric
-- ============================================================

ALTER TABLE public.answers
  ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- RPC function for atomic view count increment
CREATE OR REPLACE FUNCTION increment_view_count(answer_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.answers
  SET view_count = view_count + 1
  WHERE id = answer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
