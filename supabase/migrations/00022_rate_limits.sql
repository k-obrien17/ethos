-- Persistent rate limiting table
-- Replaces in-memory rate limiter that resets on deploy/cold start

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for efficient lookups by key + time window
CREATE INDEX idx_rate_limits_key_created ON public.rate_limits (key, created_at DESC);

-- Auto-cleanup: delete entries older than 2 hours (covers all rate limit windows)
-- Run this as a cron job or use pg_cron if available
-- For now, a simple policy to keep the table small:
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: only service role can access (rate limiting happens server-side)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed — service role bypasses RLS
