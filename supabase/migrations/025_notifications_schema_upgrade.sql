-- Migration 025: Upgrade notifications table with event_type and related entity columns
-- This enables the notification trigger system to categorize notifications

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS event_type TEXT,
ADD COLUMN IF NOT EXISTS related_entity_id UUID,
ADD COLUMN IF NOT EXISTS related_entity_type TEXT;

-- Index for filtering notifications by event type
CREATE INDEX IF NOT EXISTS idx_notifications_event_type
    ON public.notifications(event_type)
    WHERE event_type IS NOT NULL;

-- Index for looking up notifications by related entity
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity
    ON public.notifications(related_entity_id, related_entity_type)
    WHERE related_entity_id IS NOT NULL;
