-- ============================================
-- REVERT TO SIMPLE RLS POLICIES (NO RECURSION)
-- ============================================
-- This script removes the complex policies that cause
-- infinite recursion and restores the simple, working policies
-- ============================================

-- Drop ALL existing message policies (including buggy ones)
DROP POLICY IF EXISTS "Users can view messages they are part of" ON messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;

DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can insert their messages" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;

DROP POLICY IF EXISTS "Users can update their messages" ON messages;
DROP POLICY IF EXISTS "Users can update message status" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;

-- ============================================
-- RESTORE SIMPLE, WORKING POLICIES
-- ============================================

-- SELECT: Users can view messages where they are the sender OR they own the agency
CREATE POLICY "Users can view messages they are part of"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  );

-- INSERT: Users can send messages as themselves
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- UPDATE: Users can update messages where they are the sender OR they own the agency
CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION
-- ============================================

-- Show the active policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '✅ RLS policies reverted to simple, working version';
  RAISE NOTICE '✅ No more infinite recursion';
  RAISE NOTICE '✅ Messages should work for both agencies and investigators';
END $$;
