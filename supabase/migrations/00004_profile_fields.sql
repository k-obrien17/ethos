-- ============================================================
-- Add headline and organization fields to profiles
-- ============================================================
-- These fields allow experts to describe their role and company.
-- Both are nullable — existing profiles are unaffected.

ALTER TABLE public.profiles
  ADD COLUMN headline TEXT,
  ADD COLUMN organization TEXT;
