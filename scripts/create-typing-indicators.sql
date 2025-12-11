-- Create typing_indicators table for real-time typing status
-- Updated to match production schema with proper RLS policies
BEGIN;

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  is_typing boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_conversation_user UNIQUE (conversation_id, user_id)
);

-- Added indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON public.typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_user ON public.typing_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_updated ON public.typing_indicators(updated_at);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones to avoid conflicts
DROP POLICY IF EXISTS "Users can view typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can insert their own typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can update their own typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can delete their own typing indicators" ON public.typing_indicators;

-- Updated SELECT policy to properly filter by conversation participation
CREATE POLICY "Users can view typing indicators"
ON public.typing_indicators FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id::text = typing_indicators.conversation_id
      AND a.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.agency_id::text = typing_indicators.conversation_id
      AND m.sender_id = auth.uid()
    LIMIT 1
  )
);

CREATE POLICY "Users can insert their own typing indicators"
ON public.typing_indicators FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own typing indicators"
ON public.typing_indicators FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own typing indicators"
ON public.typing_indicators FOR DELETE
USING (auth.uid() = user_id);

-- Enable Realtime for typing indicators
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'typing_indicators'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators';
  END IF;
END$$;

-- Updated cleanup function to use public schema
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$;

COMMIT;
