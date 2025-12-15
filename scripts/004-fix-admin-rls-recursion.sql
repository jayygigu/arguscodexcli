-- Fix infinite recursion in admin_users RLS policies
-- The issue is that the policies reference the admin_users table itself

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin_users" ON admin_users;

-- Create a SECURITY DEFINER function to check admin status without RLS
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = check_user_id AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using the SECURITY DEFINER functions
CREATE POLICY "Admins can view admin_users" ON admin_users
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Super admins can insert admin_users" ON admin_users
  FOR INSERT WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin_users" ON admin_users
  FOR UPDATE USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admin_users" ON admin_users
  FOR DELETE USING (is_super_admin(auth.uid()));

-- Also fix the verification_logs and re_verification_alerts policies
DROP POLICY IF EXISTS "Admins can view verification_logs" ON verification_logs;
DROP POLICY IF EXISTS "Admins can insert verification_logs" ON verification_logs;
DROP POLICY IF EXISTS "Admins can view re_verification_alerts" ON re_verification_alerts;
DROP POLICY IF EXISTS "Admins can manage re_verification_alerts" ON re_verification_alerts;

CREATE POLICY "Admins can view verification_logs" ON verification_logs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert verification_logs" ON verification_logs
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view re_verification_alerts" ON re_verification_alerts
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage re_verification_alerts" ON re_verification_alerts
  FOR ALL USING (is_admin(auth.uid()));
