-- Migration: Add user_type and verification_status to profiles
-- This script documents the changes made to the database

-- Step 1: Add new columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'investigator' CHECK (user_type IN ('agency_owner', 'investigator')),
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Step 2: Update existing profiles - set agency owners
UPDATE profiles 
SET user_type = 'agency_owner'
WHERE id IN (SELECT owner_id FROM agencies WHERE owner_id IS NOT NULL);

-- Step 3: Add RLS policy for admins to update profiles (for verification)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update profiles for verification') THEN
    CREATE POLICY "Admins can update profiles for verification" ON profiles
    FOR UPDATE
    USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Step 4: Add RLS policy for admins to read all profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read all profiles') THEN
    CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Step 5: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);
