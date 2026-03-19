-- Error logging table for structured error capture
-- Stores server-side errors, warnings, and info events

CREATE TABLE error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp timestamptz DEFAULT now() NOT NULL,
  severity text NOT NULL CHECK (severity IN ('error', 'warn', 'info')),
  route text,
  method text,
  user_id uuid,
  message text NOT NULL,
  stack text,
  metadata jsonb,
  status_code integer
);

-- Indexes for common query patterns
CREATE INDEX idx_error_logs_timestamp ON error_logs (timestamp DESC);
CREATE INDEX idx_error_logs_severity ON error_logs (severity);
CREATE INDEX idx_error_logs_route ON error_logs (route);

-- Enable RLS - only service_role can access
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on error_logs"
  ON error_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
