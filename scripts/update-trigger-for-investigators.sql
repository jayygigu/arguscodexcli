-- Update the trigger to properly handle investigator signups
-- This ensures that investigator profiles are created with all necessary fields

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_metadata jsonb;
  agency_name text;
  is_investigator boolean;
BEGIN
  user_metadata := NEW.raw_user_meta_data;
  
  -- Check if this is an investigator signup
  is_investigator := COALESCE((user_metadata->>'user_type')::text = 'investigator', false);
  
  -- Check if agency metadata exists
  agency_name := user_metadata->>'agency_name';
  
  IF is_investigator THEN
    -- Create investigator profile with full data
    INSERT INTO public.profiles (
      id,
      name,
      email,
      phone,
      license_number,
      city,
      region,
      postal_code,
      years_experience,
      availability_status
    ) VALUES (
      NEW.id,
      COALESCE(user_metadata->>'name', NEW.email),
      NEW.email,
      user_metadata->>'phone',
      user_metadata->>'license_number',
      user_metadata->>'city',
      user_metadata->>'region',
      user_metadata->>'postal_code',
      COALESCE((user_metadata->>'years_experience')::integer, 0),
      'available'
    );
    
    -- Insert specialties if provided
    IF user_metadata ? 'specialties' THEN
      INSERT INTO public.profile_specialties (profile_id, specialty)
      SELECT NEW.id, jsonb_array_elements_text(user_metadata->'specialties');
    END IF;
    
  ELSIF agency_name IS NOT NULL THEN
    -- Create minimal profile for agency owner
    INSERT INTO public.profiles (
      id,
      name,
      email,
      phone
    ) VALUES (
      NEW.id,
      COALESCE(user_metadata->>'contact_name', user_metadata->>'name', NEW.email),
      COALESCE(user_metadata->>'contact_email', NEW.email),
      user_metadata->>'contact_phone'
    );
    
    -- Create agency
    INSERT INTO public.agencies (
      owner_id,
      name,
      contact_name,
      contact_phone,
      contact_email,
      contact_address,
      years_active
    ) VALUES (
      NEW.id,
      agency_name,
      COALESCE(user_metadata->>'contact_name', user_metadata->>'name', NEW.email),
      COALESCE(user_metadata->>'contact_phone', user_metadata->>'phone'),
      COALESCE(user_metadata->>'contact_email', NEW.email),
      user_metadata->>'contact_address',
      COALESCE((user_metadata->>'years_active')::integer, 0)
    );
  ELSE
    -- Default: create minimal profile
    INSERT INTO public.profiles (
      id,
      name,
      email
    ) VALUES (
      NEW.id,
      COALESCE(user_metadata->>'name', NEW.email),
      NEW.email
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
