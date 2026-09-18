-- ============================================================
-- Migration: Add job_approved_broadcast and sms channel support to ps_notification_events
-- ============================================================

-- 1. Drop existing event_type check constraint and recreate with all existing types + job_approved_broadcast
ALTER TABLE ps_notification_events 
  DROP CONSTRAINT IF EXISTS ps_notification_events_event_type_check;

ALTER TABLE ps_notification_events 
  ADD CONSTRAINT ps_notification_events_event_type_check 
  CHECK (event_type IN (
    'employer_requirement_submitted',
    'candidate_verification_submitted',
    'candidate_interest_expressed',
    'pipeline_status_changed',
    'selection_offer_update',
    'job_match_found',
    'job_approved_broadcast'
  ));

-- 2. Drop existing channel check constraint and recreate with sms support
ALTER TABLE ps_notification_events 
  DROP CONSTRAINT IF EXISTS ps_notification_events_channel_check;

ALTER TABLE ps_notification_events 
  ADD CONSTRAINT ps_notification_events_channel_check 
  CHECK (channel IN ('email', 'whatsapp', 'sms'));

-- 3. Add recipient_count column for broadcast audit if not already present
ALTER TABLE ps_notification_events
  ADD COLUMN IF NOT EXISTS recipient_count integer DEFAULT 1;

COMMENT ON COLUMN ps_notification_events.recipient_count IS 'Total recipients targeted for broadcast notifications';
