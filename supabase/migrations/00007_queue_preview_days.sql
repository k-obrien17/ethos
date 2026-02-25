-- ============================================================
-- Queue preview: user-configurable preview depth + RLS
-- ============================================================
-- Adds queue_preview_days to profiles (default 3, max 7).
-- Adds RLS policy so authenticated users can see questions
-- up to 7 days ahead. Application layer filters to user's depth.

-- Add preview depth preference to profiles
ALTER TABLE public.profiles
  ADD COLUMN queue_preview_days INTEGER NOT NULL DEFAULT 3
  CONSTRAINT queue_preview_days_range CHECK (queue_preview_days BETWEEN 1 AND 7);

-- Allow authenticated users to see upcoming questions (up to 7 days)
CREATE POLICY "Authenticated users can preview upcoming questions"
  ON public.questions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND publish_date IS NOT NULL
    AND publish_date > CURRENT_DATE
    AND publish_date <= CURRENT_DATE + interval '7 days'
    AND status IN ('scheduled', 'published')
  );
