-- Add daniel@diligenceinv.ca as super_admin with verified agency
-- Run this AFTER 001-add-verification-schema.sql and AFTER the user has registered

DO $$
DECLARE
  v_user_id UUID;
  v_agency_id UUID;
BEGIN
  -- Find the user ID for daniel@diligenceinv.ca
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'daniel@diligenceinv.ca';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email daniel@diligenceinv.ca not found. Make sure the user has registered first.';
  END IF;
  
  -- Insert into admin_users as super_admin with all permissions
  INSERT INTO admin_users (user_id, role, permissions)
  VALUES (
    v_user_id,
    'super_admin',
    '{
      "can_verify": true,
      "can_block": true,
      "can_unblock": true,
      "can_delete": true,
      "can_manage_admins": true
    }'::jsonb
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = 'super_admin',
    permissions = '{
      "can_verify": true,
      "can_block": true,
      "can_unblock": true,
      "can_delete": true,
      "can_manage_admins": true
    }'::jsonb,
    updated_at = NOW();

  RAISE NOTICE 'Admin user created for daniel@diligenceinv.ca';

  -- Find and verify the agency owned by daniel@diligenceinv.ca
  SELECT id INTO v_agency_id
  FROM agencies
  WHERE owner_id = v_user_id;
  
  IF v_agency_id IS NOT NULL THEN
    -- Update agency to fully verified status
    UPDATE agencies
    SET 
      verification_status = 'verified',
      verified_at = NOW(),
      verified_by = v_user_id,
      identity_verified = true,
      permit_verified = true,
      permit_expiration_date = (NOW() + INTERVAL '2 years')::date,
      re_verification_required = false,
      re_verification_reason = NULL,
      rejection_reason = NULL,
      last_verification_date = NOW(),
      next_verification_date = NOW() + INTERVAL '2 years',
      verification_notes = 'Super administrateur - compte vérifié automatiquement lors de la configuration initiale'
    WHERE id = v_agency_id;
    
    -- Log the verification action
    INSERT INTO verification_logs (agency_id, admin_id, action, previous_status, new_status, reason)
    VALUES (
      v_agency_id,
      v_user_id,
      'verify',
      'pending',
      'verified',
      'Vérification automatique - Super administrateur système'
    );
    
    RAISE NOTICE 'Agency % verified successfully', v_agency_id;
  ELSE
    RAISE NOTICE 'No agency found yet for daniel@diligenceinv.ca - the agency will need to be verified manually after creation';
  END IF;
    
  RAISE NOTICE 'Setup complete: daniel@diligenceinv.ca is now super_admin with full verification';
END $$;

-- Create a function to auto-verify agencies owned by super admins
CREATE OR REPLACE FUNCTION auto_verify_super_admin_agency()
RETURNS TRIGGER AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if the owner is a super_admin
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = NEW.owner_id AND role = 'super_admin'
  ) INTO v_is_super_admin;
  
  -- If owner is super_admin, auto-verify the agency
  IF v_is_super_admin THEN
    NEW.verification_status := 'verified';
    NEW.verified_at := NOW();
    NEW.verified_by := NEW.owner_id;
    NEW.identity_verified := TRUE;
    NEW.permit_verified := TRUE;
    NEW.permit_expiration_date := (NOW() + INTERVAL '2 years')::date;
    NEW.re_verification_required := FALSE;
    NEW.verification_notes := 'Auto-vérifié - propriétaire est super administrateur';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-verify agencies created by super admins
DROP TRIGGER IF EXISTS trigger_auto_verify_super_admin_agency ON agencies;
CREATE TRIGGER trigger_auto_verify_super_admin_agency
  BEFORE INSERT ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION auto_verify_super_admin_agency();
