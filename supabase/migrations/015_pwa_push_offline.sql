-- ═══════════════════════════════════════════════════════════════
-- Migration 015: PWA Push Subscriptions & Offline Sync Log
-- ═══════════════════════════════════════════════════════════════

-- Push notification subscriptions for Web Push API
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text,
  auth        text,
  -- Notification category mute controls
  mute_assignments  boolean DEFAULT false,
  mute_grades       boolean DEFAULT false,
  mute_live         boolean DEFAULT false,
  mute_announcements boolean DEFAULT false,
  mute_certificates  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Offline sync log — stores actions taken offline to be replayed when back online
CREATE TABLE IF NOT EXISTS public.offline_sync_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,   -- e.g. 'lesson_complete', 'quiz_attempt'
  payload     jsonb NOT NULL DEFAULT '{}',
  synced      boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.offline_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_sync_log" ON public.offline_sync_log
  FOR ALL USING (auth.uid() = user_id);

-- App-level notification settings per user (alternative to push_subscriptions columns)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications  boolean DEFAULT true,
  push_notifications   boolean DEFAULT true,
  mute_assignments     boolean DEFAULT false,
  mute_grades          boolean DEFAULT false,
  mute_live            boolean DEFAULT false,
  mute_announcements   boolean DEFAULT false,
  mute_certificates    boolean DEFAULT false,
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_prefs" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Ensure enrollment_applications has a status column and courses FK
-- (safe to run if columns already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollment_applications' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.enrollment_applications ADD COLUMN status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollment_applications' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.enrollment_applications ADD COLUMN phone text;
  END IF;
END $$;

-- Index for fast pending-application lookups
CREATE INDEX IF NOT EXISTS idx_enrollment_applications_status
  ON public.enrollment_applications(status);

-- Index for fast unread notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, read)
  WHERE read = false;
