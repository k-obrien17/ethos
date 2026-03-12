-- Add comment_reply and followed_expert_posted notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'featured', 'follow', 'comment_reply', 'followed_expert_posted'));
