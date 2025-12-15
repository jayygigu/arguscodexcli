-- =====================================================
-- ADD ADMIN RLS POLICIES
-- This script adds policies to allow admin users to 
-- manage agencies (verify, suspend, reject, etc.)
-- =====================================================

-- Policy: Admins can update agencies (for verification, suspension, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agencies' 
    AND policyname = 'Admins can update agencies'
  ) THEN
    CREATE POLICY "Admins can update agencies" ON agencies
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM admin_users au 
        WHERE au.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM admin_users au 
        WHERE au.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Policy: Admins can view all agencies (already exists but adding for completeness)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agencies' 
    AND policyname = 'Admins can view agencies'
  ) THEN
    CREATE POLICY "Admins can view agencies" ON agencies
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM admin_users au 
        WHERE au.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Verify policies are in place
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'agencies'
ORDER BY policyname;
