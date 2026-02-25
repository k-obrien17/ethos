-- Seed file for local development
-- Note: Profile creation happens via auth trigger, not manual insert.
-- To test, sign up via the OAuth flow in the running app.

-- Seed a few questions for testing the public feed
INSERT INTO public.questions (body, slug, category, publish_date, status) VALUES
  ('What is the most important lesson you learned this year?', 'most-important-lesson-this-year', 'Growth', CURRENT_DATE, 'published'),
  ('What would you tell your industry peers that they don''t want to hear?', 'tell-peers-dont-want-to-hear', 'Leadership', CURRENT_DATE - INTERVAL '1 day', 'published'),
  ('What skill will be most valuable in your field five years from now?', 'most-valuable-skill-five-years', 'Strategy', CURRENT_DATE + INTERVAL '1 day', 'scheduled');
