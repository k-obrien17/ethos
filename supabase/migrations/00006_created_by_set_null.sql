-- Fix: questions.created_by FK defaults to NO ACTION, which blocks
-- deletion of admin profiles that have created questions.
-- Change to ON DELETE SET NULL so account deletion cascades properly.
ALTER TABLE public.questions
  DROP CONSTRAINT questions_created_by_fkey,
  ADD CONSTRAINT questions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id)
    ON DELETE SET NULL;
