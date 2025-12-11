-- Add NOT NULL constraints to latitude and longitude
-- This ensures coordinates are always present after geocoding

-- First, update any existing NULL values (if any) with a default Montreal location
-- This is a safety measure for any legacy data
UPDATE mandates 
SET 
  latitude = 45.5017,
  longitude = -73.5673
WHERE latitude IS NULL OR longitude IS NULL;

-- Now add NOT NULL constraints
ALTER TABLE mandates 
ALTER COLUMN latitude SET NOT NULL;

ALTER TABLE mandates 
ALTER COLUMN longitude SET NOT NULL;

-- Add a check constraint to ensure coordinates are within valid ranges
-- Latitude: -90 to 90, Longitude: -180 to 180
ALTER TABLE mandates
ADD CONSTRAINT mandates_latitude_check 
CHECK (latitude >= -90 AND latitude <= 90);

ALTER TABLE mandates
ADD CONSTRAINT mandates_longitude_check 
CHECK (longitude >= -180 AND longitude <= 180);

-- Add a check constraint to ensure coordinates are within Quebec bounds (approximately)
-- Quebec latitude: ~45 to ~62, longitude: ~-79 to ~-57
ALTER TABLE mandates
ADD CONSTRAINT mandates_quebec_bounds_check 
CHECK (
  latitude >= 45 AND latitude <= 62 AND
  longitude >= -79 AND longitude <= -57
);

-- Add an index on coordinates for efficient spatial queries
CREATE INDEX IF NOT EXISTS idx_mandates_coordinates 
ON mandates(latitude, longitude);

-- Add a comment to document the geocoding requirement
COMMENT ON COLUMN mandates.latitude IS 'Latitude coordinate from geocoded postal_code. Must be set via geocoding API before insertion.';
COMMENT ON COLUMN mandates.longitude IS 'Longitude coordinate from geocoded postal_code. Must be set via geocoding API before insertion.';
