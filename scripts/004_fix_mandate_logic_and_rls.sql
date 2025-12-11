-- Fix RLS policies for critical tables
ALTER TABLE public.investigator_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandate_ratings ENABLE ROW LEVEL SECURITY;

-- RLS for investigator_favorites
CREATE POLICY "Agency owners can manage their favorites"
ON public.investigator_favorites
FOR ALL
TO authenticated
USING (
  agency_id IN (
    SELECT id FROM public.agencies WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "All users can view favorites for stats"
ON public.investigator_favorites
FOR SELECT
TO authenticated
USING (true);

-- RLS for investigator_stats
CREATE POLICY "Everyone can view investigator stats"
ON public.investigator_stats
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can update investigator stats"
ON public.investigator_stats
FOR ALL
TO authenticated
USING (true);

-- RLS for mandate_ratings
CREATE POLICY "Agency owners can create ratings for their mandates"
ON public.mandate_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id IN (
    SELECT id FROM public.agencies WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Everyone can view ratings"
ON public.mandate_ratings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Agency owners can update their ratings"
ON public.mandate_ratings
FOR UPDATE
TO authenticated
USING (
  agency_id IN (
    SELECT id FROM public.agencies WHERE owner_id = auth.uid()
  )
);

-- Improve trigger for better candidature management
CREATE OR REPLACE FUNCTION public.sync_candidatures_on_unassign()
RETURNS TRIGGER AS $$
BEGIN
  -- When unassigning (assigned_to becomes null)
  IF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL THEN
    -- Reset ONLY the accepted candidature back to interested
    UPDATE public.mandate_interests
    SET status = 'interested', updated_at = now()
    WHERE mandate_id = NEW.id 
      AND investigator_id = OLD.assigned_to
      AND status = 'accepted';
    
    -- Keep rejected candidatures as rejected (don't reopen them)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_candidatures_on_unassign ON public.mandates;
CREATE TRIGGER trigger_sync_candidatures_on_unassign
AFTER UPDATE ON public.mandates
FOR EACH ROW
WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
EXECUTE FUNCTION public.sync_candidatures_on_unassign();

-- Add constraint to prevent multiple accepted candidatures per mandate
CREATE UNIQUE INDEX IF NOT EXISTS idx_mandate_interests_unique_accepted
ON public.mandate_interests (mandate_id)
WHERE status = 'accepted';

-- Add check constraint for valid mandate status transitions
ALTER TABLE public.mandates
DROP CONSTRAINT IF EXISTS check_valid_status;

ALTER TABLE public.mandates
ADD CONSTRAINT check_valid_status
CHECK (status IN ('open', 'assigned', 'in-progress', 'completed', 'cancelled', 'expired'));

-- Add check constraint: if status is in-progress or assigned, must have assigned_to
ALTER TABLE public.mandates
DROP CONSTRAINT IF EXISTS check_assigned_investigator;

ALTER TABLE public.mandates
ADD CONSTRAINT check_assigned_investigator
CHECK (
  (status IN ('in-progress', 'assigned') AND assigned_to IS NOT NULL)
  OR
  (status NOT IN ('in-progress', 'assigned'))
);

-- Add check constraint: if status is open, cannot have assigned_to
ALTER TABLE public.mandates
DROP CONSTRAINT IF EXISTS check_open_no_assignment;

ALTER TABLE public.mandates
ADD CONSTRAINT check_open_no_assignment
CHECK (
  (status = 'open' AND assigned_to IS NULL)
  OR
  (status != 'open')
);

COMMENT ON TABLE public.investigator_favorites IS 'Stores agency favorite investigators with RLS enabled';
COMMENT ON TABLE public.investigator_stats IS 'Performance statistics for investigators with RLS enabled';
COMMENT ON TABLE public.mandate_ratings IS 'Agency ratings for completed mandates with RLS enabled';
