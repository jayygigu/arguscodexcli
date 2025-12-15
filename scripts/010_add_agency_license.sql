-- =============================================
-- Add license_number column to agencies table
-- =============================================

-- Add license_number column if it doesn't exist
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS license_number TEXT;

-- Add verification_status column for tracking agency verification
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Add constraint for verification status
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_verification_status_check;
ALTER TABLE agencies ADD CONSTRAINT agencies_verification_status_check 
  CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agencies_verification_status ON agencies(verification_status);
CREATE INDEX IF NOT EXISTS idx_agencies_license_number ON agencies(license_number);
