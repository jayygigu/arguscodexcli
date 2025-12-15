-- Fix Row Level Security policies for messages table
-- Version 2: Corrected to use investigator_id instead of mandate_id

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages they are part of" ON messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can update message status" ON messages;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;

-- 2. Create simple SELECT policy
-- Users can see messages where they are part of the conversation
CREATE POLICY "messages_select_policy" ON messages
FOR SELECT USING (
  -- I sent this message
  sender_id = auth.uid()
  OR
  -- I own the agency that this message belongs to
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
  OR
  -- I'm the investigator in this conversation
  investigator_id = auth.uid()
);

-- 3. Create INSERT policy
-- Users can only insert messages as themselves
CREATE POLICY "messages_insert_policy" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND
  (
    -- Agency owners can send messages on behalf of their agency
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE agencies.id = messages.agency_id 
      AND agencies.owner_id = auth.uid()
    )
    OR
    -- Investigators can send messages in their conversations
    investigator_id = auth.uid()
  )
);

-- 4. Create UPDATE policy
-- Users can update messages to mark them as read
CREATE POLICY "messages_update_policy" ON messages
FOR UPDATE USING (
  -- I own the agency
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
  OR
  -- I'm the investigator and can mark messages as read
  investigator_id = auth.uid()
);

-- 5. Ensure Realtime is enabled for messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_agency_sender ON messages(agency_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_investigator ON messages(investigator_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
