-- ============================================================
-- submit_answer() — Atomic answer submission with budget enforcement
-- ============================================================
-- Uses an advisory lock to serialize concurrent submissions by
-- the same expert, preventing race conditions on the monthly
-- answer limit check.
--
-- Returns the full answers row on success.
-- Raises exception on:
--   - 'Profile not found' (invalid expert_id)
--   - 'Monthly answer limit reached' (budget exhausted)
--   - Unique constraint violation (duplicate answer to same question)
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_answer(
  p_expert_id UUID,
  p_question_id UUID,
  p_body TEXT
) RETURNS public.answers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_limit INT;
  v_word_count INT;
  v_answer public.answers;
BEGIN
  -- Advisory lock on expert_id prevents concurrent submissions
  -- Lock is transaction-scoped: released on COMMIT or ROLLBACK
  PERFORM pg_advisory_xact_lock(hashtext(p_expert_id::text));

  -- Get expert's answer limit from profile
  SELECT answer_limit INTO v_limit
  FROM public.profiles WHERE id = p_expert_id;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Count answers submitted this calendar month
  SELECT COUNT(*) INTO v_count
  FROM public.answers
  WHERE expert_id = p_expert_id
  AND created_at >= date_trunc('month', now());

  -- Enforce monthly budget
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Monthly answer limit reached';
  END IF;

  -- Compute word count (split on whitespace)
  v_word_count := array_length(
    regexp_split_to_array(trim(p_body), '\s+'), 1
  );
  IF v_word_count IS NULL THEN
    v_word_count := 0;
  END IF;

  -- Insert the answer
  -- The UNIQUE index idx_answers_expert_question prevents
  -- duplicate answers to the same question
  INSERT INTO public.answers (expert_id, question_id, body, word_count)
  VALUES (p_expert_id, p_question_id, p_body, v_word_count)
  RETURNING * INTO v_answer;

  RETURN v_answer;
END;
$$;

-- Grant execute to authenticated users (Supabase role)
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, UUID, TEXT)
TO authenticated;
