-- Enable pg_cron if available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly cleanup of stale conversation states (older than 24h)
SELECT cron.schedule(
  'cleanup-conversation-state',
  '0 * * * *',
  $$DELETE FROM public.conversation_state WHERE updated_at < now() - interval '24 hours'$$
);
