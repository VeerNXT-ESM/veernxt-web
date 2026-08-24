-- `notifications` (distinct from `user_notifications`) had 0 rows and zero
-- references anywhere in veernxt-web or scraper-app -- confirmed via
-- grep across both repos before dropping. No app code, script, or API
-- route ever read or wrote to it.
drop table if exists public.notifications;
