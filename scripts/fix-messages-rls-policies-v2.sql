-- Fix Row Level Security policies for messages table
-- Version 2: Removes infinite recursion by avoiding self-referencing subqueries

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

-- 2. Create simple SELECT policy without recursion
-- This allows users to see messages based on direct relationships, not subqueries
CREATE POLICY "messages_select_policy" ON messages
FOR SELECT USING (
  -- Case 1: I sent this message
  sender_id = auth.uid()
  OR
  -- Case 2: I own the agency that this message belongs to
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
  OR
  -- Case 3: I'm an investigator interested in this mandate
  (
    mandate_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM mandate_interests mi
      WHERE mi.mandate_id = messages.mandate_id
      AND mi.investigator_id = auth.uid()
    )
  )
  OR
  -- Case 4: For direct messages (mandate_id IS NULL), 
  -- I can see messages if I'm in the investigators table for this agency
  (
    mandate_id IS NULL
    AND sender_type = 'agency'
    AND EXISTS (
      SELECT 1 FROM investigators inv
      WHERE inv.id = auth.uid()
    )
  )
);

-- 3. Create INSERT policy
-- Users can only insert messages as themselves or on behalf of their agency
CREATE POLICY "messages_insert_policy" ON messages
FOR INSERT WITH CHECK (
  -- I can insert messages as myself
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
-- Users can update messages to mark them as read/delivered
CREATE POLICY "messages_update_policy" ON messages
FOR UPDATE USING (
  -- I can update messages in my agency's conversations
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
  OR
  -- I can update messages where I'm the recipient (to mark as read)
  (
    sender_id != auth.uid()
    AND (
      -- For mandate-based messages
      (
        mandate_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM mandate_interests mi
          WHERE mi.mandate_id = messages.mandate_id
          AND mi.investigator_id = auth.uid()
        )
      )
      OR
      -- For direct messages to investigators
      (
        mandate_id IS NULL
        AND sender_type = 'agency'
        AND EXISTS (
          SELECT 1 FROM investigators inv
          WHERE inv.id = auth.uid()
        )
      )
    )
  )
);

-- 5. Ensure Realtime is enabled for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_agency_sender ON messages(agency_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_mandate ON messages(mandate_id) WHERE mandate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);

-- 7. Add helpful comment
COMMENT ON TABLE messages IS 'Messages between agencies and investigators. RLS policies v2: Fixed infinite recursion issue.';
