-- Fix Row Level Security policies for messages table
-- This script uses agency_id and investigator_id (not mandate_id) 

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages they are part of" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can update message status" ON messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their messages" ON messages;
DROP POLICY IF EXISTS "Users can only view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can only send messages as themselves" ON messages;
DROP POLICY IF EXISTS "Users can only update their own messages" ON messages;

-- 2. Create comprehensive SELECT policy
-- Uses investigator_id instead of mandate_id
CREATE POLICY "Users can view conversation messages" ON messages
FOR SELECT USING (
  -- I can see my own messages (messages I sent)
  sender_id = auth.uid()
  OR
  -- I can see messages where I'm the investigator
  investigator_id = auth.uid()
  OR
  -- Agencies can see all messages in their conversations
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
);

-- 3. Create INSERT policy
CREATE POLICY "Users can insert their messages" ON messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  OR
  -- Agency owners can send messages on behalf of their agency
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
);

-- 4. Create UPDATE policy
CREATE POLICY "Users can update message status" ON messages
FOR UPDATE USING (
  -- I can update messages in my conversations (to mark as read)
  investigator_id = auth.uid()
  OR
  -- Agency owners can update their agency's messages
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
)
WITH CHECK (
  investigator_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
);

-- 5. Verify Realtime is enabled for messages table (ignore error if already added)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Create indexes for better query performance
-- Uses investigator_id instead of mandate_id
CREATE INDEX IF NOT EXISTS idx_messages_agency_sender ON messages(agency_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_investigator ON messages(investigator_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 7. Add helpful comment
COMMENT ON TABLE messages IS 'Messages between agencies and investigators. RLS policies ensure users only see messages in their conversations.';
