-- Simple fix: Disable RLS on admin_users table
-- This is safe because the table only contains admin user IDs, no sensitive data

-- Drop ALL existing policies on admin_users
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can update admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can delete admin_users" ON admin_users;

-- Disable RLS on admin_users (allows all authenticated users to read, but table is small and non-sensitive)
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with a simple non-recursive policy
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to SELECT (check if they are admin)
CREATE POLICY "Authenticated users can check admin status" ON admin_users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the postgres role can INSERT/UPDATE/DELETE (done via SECURITY DEFINER functions or direct DB access)
CREATE POLICY "Service role can manage admins" ON admin_users
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
