-- Add verification columns to agencies table
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' 
  CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended', 'expired')),
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS permit_expiration_date DATE,
ADD COLUMN IF NOT EXISTS permit_document_url TEXT,
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS permit_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS last_verification_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_verification_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS re_verification_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS re_verification_reason TEXT;

-- Create admin_users table to track admin privileges
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '{"can_verify": true, "can_block": true, "can_unblock": true, "can_delete": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create verification_logs table for audit trail
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('verify', 'reject', 'suspend', 'unsuspend', 'request_reverification', 'update_permit', 'update_expiration', 'notes_added')),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create re_verification_alerts table for scheduling
CREATE TABLE IF NOT EXISTS re_verification_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('30_days', '14_days', '7_days', 'expired', 'custom')),
  alert_date DATE NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, alert_type, alert_date)
);

-- Enable RLS on new tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_verification_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Admins can view admin_users" ON admin_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Super admins can manage admin_users" ON admin_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid() AND au.role = 'super_admin')
  );

-- RLS Policies for verification_logs
CREATE POLICY "Admins can view verification_logs" ON verification_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Admins can insert verification_logs" ON verification_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

-- RLS Policies for re_verification_alerts
CREATE POLICY "Admins can view re_verification_alerts" ON re_verification_alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage re_verification_alerts" ON re_verification_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agencies_verification_status ON agencies(verification_status);
CREATE INDEX IF NOT EXISTS idx_agencies_permit_expiration ON agencies(permit_expiration_date);
CREATE INDEX IF NOT EXISTS idx_agencies_re_verification ON agencies(re_verification_required);
CREATE INDEX IF NOT EXISTS idx_verification_logs_agency ON verification_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_admin ON verification_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_re_verification_alerts_date ON re_verification_alerts(alert_date);

-- Function to automatically create re-verification alerts when permit expiration is set
CREATE OR REPLACE FUNCTION create_reverification_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing alerts for this agency
  DELETE FROM re_verification_alerts WHERE agency_id = NEW.id;
  
  -- Create new alerts if permit_expiration_date is set
  IF NEW.permit_expiration_date IS NOT NULL THEN
    -- 30 days before expiration
    INSERT INTO re_verification_alerts (agency_id, alert_type, alert_date)
    VALUES (NEW.id, '30_days', NEW.permit_expiration_date - INTERVAL '30 days')
    ON CONFLICT DO NOTHING;
    
    -- 14 days before expiration
    INSERT INTO re_verification_alerts (agency_id, alert_type, alert_date)
    VALUES (NEW.id, '14_days', NEW.permit_expiration_date - INTERVAL '14 days')
    ON CONFLICT DO NOTHING;
    
    -- 7 days before expiration
    INSERT INTO re_verification_alerts (agency_id, alert_type, alert_date)
    VALUES (NEW.id, '7_days', NEW.permit_expiration_date - INTERVAL '7 days')
    ON CONFLICT DO NOTHING;
    
    -- On expiration date
    INSERT INTO re_verification_alerts (agency_id, alert_type, alert_date)
    VALUES (NEW.id, 'expired', NEW.permit_expiration_date)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create alerts when permit expiration date changes
DROP TRIGGER IF EXISTS trigger_create_reverification_alerts ON agencies;
CREATE TRIGGER trigger_create_reverification_alerts
  AFTER INSERT OR UPDATE OF permit_expiration_date ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION create_reverification_alerts();

-- Function to check and flag agencies needing re-verification
CREATE OR REPLACE FUNCTION check_permit_expirations()
RETURNS void AS $$
BEGIN
  -- Flag agencies where permit has expired
  UPDATE agencies
  SET 
    re_verification_required = TRUE,
    re_verification_reason = 'Permit expired on ' || permit_expiration_date::text,
    verification_status = 'expired'
  WHERE 
    permit_expiration_date <= CURRENT_DATE
    AND verification_status = 'verified'
    AND (re_verification_required = FALSE OR re_verification_required IS NULL);
    
  -- Flag agencies approaching expiration (within 30 days)
  UPDATE agencies
  SET 
    re_verification_required = TRUE,
    re_verification_reason = 'Permit expiring on ' || permit_expiration_date::text
  WHERE 
    permit_expiration_date <= CURRENT_DATE + INTERVAL '30 days'
    AND permit_expiration_date > CURRENT_DATE
    AND verification_status = 'verified'
    AND (re_verification_required = FALSE OR re_verification_required IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
