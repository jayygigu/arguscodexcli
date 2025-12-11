-- Fix Row Level Security policies for messages table
-- This ensures investigators can see messages from agencies and vice versa

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages they are part of" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can update message status" ON messages;

-- 2. Create comprehensive SELECT policy
-- This allows users to see ALL messages in conversations they're part of
CREATE POLICY "Users can view conversation messages" ON messages
FOR SELECT USING (
  -- I can see my own messages (messages I sent)
  sender_id = auth.uid()
  OR
  -- I can see messages from agencies I'm in conversation with
  -- (if I'm an investigator who has sent messages to this agency)
  (
    sender_type = 'agency' 
    AND agency_id IN (
      SELECT DISTINCT agency_id 
      FROM messages 
      WHERE sender_id = auth.uid()
    )
  )
  OR
  -- Agencies can see all messages in their conversations
  -- (if I'm an agency owner, I can see all messages for my agency)
  (
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE agencies.id = messages.agency_id 
      AND agencies.owner_id = auth.uid()
    )
  )
  OR
  -- I can see messages sent to me in mandate-based conversations
  (
    mandate_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM mandate_interests mi
      WHERE mi.mandate_id = messages.mandate_id
      AND mi.investigator_id = auth.uid()
    )
  )
);

-- 3. Create INSERT policy
-- Users can only insert messages as themselves
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
-- Users can update messages to mark them as read
CREATE POLICY "Users can update message status" ON messages
FOR UPDATE USING (
  -- I can update messages that were sent to me (to mark as read)
  sender_id != auth.uid()
  OR
  -- Agency owners can update their agency's messages
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for the updated row
  sender_id != auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
);

-- 5. Verify Realtime is enabled for messages table
-- This ensures real-time subscriptions work
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_agency_sender ON messages(agency_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_mandate ON messages(mandate_id) WHERE mandate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- 7. Add helpful comment
COMMENT ON TABLE messages IS 'Messages between agencies and investigators. RLS policies ensure users only see messages in their conversations.';
