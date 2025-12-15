-- Add NOT NULL constraints to latitude and longitude
-- This script is idempotent and can be run multiple times safely

-- First, update any existing NULL values with default Montreal location
UPDATE mandates 
SET 
  latitude = 45.5017,
  longitude = -73.5673
WHERE latitude IS NULL OR longitude IS NULL;

-- Made idempotent - check if NOT NULL already set before altering
DO $$ 
BEGIN
  -- Add NOT NULL constraint to latitude if not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mandates' 
    AND column_name = 'latitude' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE mandates ALTER COLUMN latitude SET NOT NULL;
  END IF;
  
  -- Add NOT NULL constraint to longitude if not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mandates' 
    AND column_name = 'longitude' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE mandates ALTER COLUMN longitude SET NOT NULL;
  END IF;
END $$;

-- Made idempotent - check if constraints exist before adding
DO $$ 
BEGIN
  -- Add latitude range check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mandates_latitude_check'
  ) THEN
    ALTER TABLE mandates
    ADD CONSTRAINT mandates_latitude_check 
    CHECK (latitude >= -90 AND latitude <= 90);
  END IF;
  
  -- Add longitude range check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mandates_longitude_check'
  ) THEN
    ALTER TABLE mandates
    ADD CONSTRAINT mandates_longitude_check 
    CHECK (longitude >= -180 AND longitude <= 180);
  END IF;
  
  -- Add Quebec bounds check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mandates_quebec_bounds_check'
  ) THEN
    ALTER TABLE mandates
    ADD CONSTRAINT mandates_quebec_bounds_check 
    CHECK (
      latitude >= 45 AND latitude <= 62 AND
      longitude >= -79 AND longitude <= -57
    );
  END IF;
END $$;

-- Add index on coordinates (IF NOT EXISTS is built-in)
CREATE INDEX IF NOT EXISTS idx_mandates_coordinates 
ON mandates(latitude, longitude);

-- Add documentation comments
COMMENT ON COLUMN mandates.latitude IS 'Latitude coordinate from geocoded postal_code. Must be set via geocoding API before insertion.';
COMMENT ON COLUMN mandates.longitude IS 'Longitude coordinate from geocoded postal_code. Must be set via geocoding API before insertion.';
