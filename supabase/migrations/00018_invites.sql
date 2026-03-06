-- Invite codes table
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_code ON public.invites(code) WHERE claimed_by IS NULL;

-- Track who invited a user
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins can read all invites
CREATE POLICY "Admins can manage invites"
  ON public.invites FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Anyone can read a specific invite by code (for validation during signup)
CREATE POLICY "Anyone can validate invite codes"
  ON public.invites FOR SELECT
  USING (true);

-- Service role can update (for claiming)
CREATE POLICY "Users can claim invites"
  ON public.invites FOR UPDATE
  USING (claimed_by IS NULL)
  WITH CHECK (claimed_by = auth.uid());
