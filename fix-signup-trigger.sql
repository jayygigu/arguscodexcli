-- Enhanced trigger: materialize auth metadata into public.profiles and profile_specialties
-- Run in Supabase SQL editor. Adjust RLS policies accordingly.

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  md jsonb := NEW.raw_user_meta_data;
  md_specs jsonb;
  spec text;
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    email,
    phone,
    address,
    city,
    region,
    postal_code,
    license_number,
    years_experience,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(md->>'name', ''),
    NEW.email,
    NULLIF(md->>'phone', ''),
    NULLIF(md->>'address', ''),
    NULLIF(md->>'city', ''),
    NULLIF(md->>'region', ''),
    NULLIF(md->>'postal_code', ''),
    NULLIF(md->>'license_number', ''),
    COALESCE((md->>'years_experience')::int, 0),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  md_specs := md->'specialties';
  IF jsonb_typeof(md_specs) = 'array' THEN
    FOR spec IN SELECT jsonb_array_elements_text(md_specs)
    LOOP
      INSERT INTO public.profile_specialties (profile_id, specialty)
      VALUES (NEW.id, spec::text)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
