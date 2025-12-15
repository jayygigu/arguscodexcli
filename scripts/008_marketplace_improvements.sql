-- =====================================================
-- SCRIPT: Marketplace Logic Improvements
-- Purpose: Add distance calculation, auto stats, expiration
-- =====================================================

-- 1. Function to calculate distance between investigator and mandate
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 NUMERIC, lon1 NUMERIC,
  lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  -- If coordinates are missing, return NULL
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Use PostGIS ST_Distance if geom columns exist, otherwise Haversine
  RETURN ROUND(
    (6371 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) * 
      cos(radians(lon2) - radians(lon1)) + 
      sin(radians(lat1)) * sin(radians(lat2))
    ))::NUMERIC, 1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. View for candidatures with distance and urgency score
DROP VIEW IF EXISTS public.candidatures_with_details;
CREATE VIEW public.candidatures_with_details AS
SELECT 
  mi.id,
  mi.mandate_id,
  mi.investigator_id,
  mi.status,
  mi.created_at,
  mi.updated_at,
  -- Mandate info
  m.title AS mandate_title,
  m.city AS mandate_city,
  m.region AS mandate_region,
  m.date_required,
  m.latitude AS mandate_lat,
  m.longitude AS mandate_lon,
  m.agency_id,
  -- Investigator info
  p.name AS investigator_name,
  p.city AS investigator_city,
  p.region AS investigator_region,
  p.latitude AS investigator_lat,
  p.longitude AS investigator_lon,
  p.availability_status,
  -- Distance calculation
  public.calculate_distance_km(
    m.latitude, m.longitude,
    p.latitude, p.longitude
  ) AS distance_km,
  -- Urgency score (days until required)
  EXTRACT(DAY FROM (m.date_required - NOW())) AS days_until_required,
  -- Urgency flag
  CASE 
    WHEN m.date_required <= NOW() + INTERVAL '48 hours' THEN 'critical'
    WHEN m.date_required <= NOW() + INTERVAL '7 days' THEN 'urgent'
    ELSE 'normal'
  END AS urgency_level,
  -- Stats
  COALESCE(ist.average_rating, 0) AS investigator_rating,
  COALESCE(ist.total_mandates_completed, 0) AS investigator_completed_mandates
FROM public.mandate_interests mi
JOIN public.mandates m ON m.id = mi.mandate_id
JOIN public.profiles p ON p.id = mi.investigator_id
LEFT JOIN public.investigator_stats ist ON ist.investigator_id = mi.investigator_id;

-- 3. Trigger to auto-update investigator_stats when mandate completes
CREATE OR REPLACE FUNCTION public.update_investigator_stats_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_investigator_id UUID;
  v_was_on_time BOOLEAN;
BEGIN
  -- Only run when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_to IS NOT NULL THEN
    v_investigator_id := NEW.assigned_to;
    v_was_on_time := NEW.updated_at <= NEW.date_required;
    
    -- Upsert investigator stats
    INSERT INTO public.investigator_stats (
      investigator_id,
      total_mandates_completed,
      total_mandates_in_progress,
      last_mandate_date,
      on_time_rate,
      created_at,
      updated_at
    ) VALUES (
      v_investigator_id,
      1,
      0,
      NOW(),
      CASE WHEN v_was_on_time THEN 100 ELSE 0 END,
      NOW(),
      NOW()
    )
    ON CONFLICT (investigator_id) DO UPDATE SET
      total_mandates_completed = investigator_stats.total_mandates_completed + 1,
      total_mandates_in_progress = GREATEST(0, investigator_stats.total_mandates_in_progress - 1),
      last_mandate_date = NOW(),
      on_time_rate = (
        (investigator_stats.on_time_rate * investigator_stats.total_mandates_completed + 
         CASE WHEN v_was_on_time THEN 100 ELSE 0 END) / 
        (investigator_stats.total_mandates_completed + 1)
      ),
      updated_at = NOW();
  
  -- When status changes to 'in-progress', increment in_progress count
  ELSIF NEW.status = 'in-progress' AND OLD.status != 'in-progress' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.investigator_stats (
      investigator_id,
      total_mandates_in_progress,
      total_mandates_completed,
      created_at,
      updated_at
    ) VALUES (
      NEW.assigned_to,
      1,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (investigator_id) DO UPDATE SET
      total_mandates_in_progress = investigator_stats.total_mandates_in_progress + 1,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_investigator_stats ON public.mandates;
CREATE TRIGGER trigger_update_investigator_stats
AFTER UPDATE ON public.mandates
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_investigator_stats_on_completion();

-- 4. Function to expire past mandates (to be called via cron or manually)
CREATE OR REPLACE FUNCTION public.expire_past_mandates()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.mandates
    SET 
      status = 'expired',
      updated_at = NOW()
    WHERE 
      status = 'open'
      AND date_required < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Add expired status to valid statuses
ALTER TABLE public.mandates
DROP CONSTRAINT IF EXISTS mandates_status_check;

ALTER TABLE public.mandates
ADD CONSTRAINT mandates_status_check
CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled', 'expired'));

-- 6. Index for faster urgency queries
CREATE INDEX IF NOT EXISTS idx_mandates_date_required_status 
ON public.mandates (date_required, status) 
WHERE status = 'open';

-- 7. Index for distance-based queries (using lat/lon)
CREATE INDEX IF NOT EXISTS idx_profiles_coordinates 
ON public.profiles (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mandates_coordinates 
ON public.mandates (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 8. Grant access to the view
GRANT SELECT ON public.candidatures_with_details TO authenticated;

COMMENT ON VIEW public.candidatures_with_details IS 'Candidatures enriched with distance, urgency, and investigator stats';
COMMENT ON FUNCTION public.calculate_distance_km IS 'Calculate distance in km between two lat/lon points using Haversine formula';
COMMENT ON FUNCTION public.expire_past_mandates IS 'Expire open mandates past their date_required - call via cron';
