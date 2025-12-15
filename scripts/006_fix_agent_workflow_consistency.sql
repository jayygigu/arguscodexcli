-- =====================================================
-- SCRIPT: Fix Agent Workflow Consistency
-- Purpose: Ensure data integrity for investigator assignment workflow
-- =====================================================

-- 1. Add constraint: Only ONE accepted candidature per mandate
DROP INDEX IF EXISTS idx_mandate_interests_unique_accepted;
CREATE UNIQUE INDEX idx_mandate_interests_unique_accepted
ON public.mandate_interests (mandate_id)
WHERE status = 'accepted';

-- 2. Add check constraint for mandate status consistency
ALTER TABLE public.mandates
DROP CONSTRAINT IF EXISTS check_mandate_assignment_consistency;

ALTER TABLE public.mandates
ADD CONSTRAINT check_mandate_assignment_consistency
CHECK (
  -- If in-progress, must have assigned_to
  (status = 'in-progress' AND assigned_to IS NOT NULL)
  OR
  -- If open, must NOT have assigned_to
  (status = 'open' AND assigned_to IS NULL)
  OR
  -- Other statuses can be either
  (status NOT IN ('open', 'in-progress'))
);

-- 3. Improved trigger: Sync candidatures when mandate assignment changes
CREATE OR REPLACE FUNCTION public.sync_candidatures_on_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When assigning (assigned_to set from null)
  IF OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL THEN
    -- Check if there's already an accepted candidature for this investigator
    IF NOT EXISTS (
      SELECT 1 FROM public.mandate_interests 
      WHERE mandate_id = NEW.id 
        AND investigator_id = NEW.assigned_to 
        AND status = 'accepted'
    ) THEN
      -- Create or update candidature to accepted for direct assignments
      INSERT INTO public.mandate_interests (mandate_id, investigator_id, status, created_at, updated_at)
      VALUES (NEW.id, NEW.assigned_to, 'accepted', now(), now())
      ON CONFLICT (mandate_id, investigator_id) 
      DO UPDATE SET status = 'accepted', updated_at = now();
    END IF;
    
    -- Reject other interested candidatures
    UPDATE public.mandate_interests
    SET status = 'rejected', updated_at = now()
    WHERE mandate_id = NEW.id 
      AND investigator_id != NEW.assigned_to
      AND status = 'interested';
  
  -- When unassigning (assigned_to becomes null)
  ELSIF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL THEN
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

DROP TRIGGER IF EXISTS trigger_sync_candidatures_on_assignment ON public.mandates;
CREATE TRIGGER trigger_sync_candidatures_on_assignment
AFTER UPDATE ON public.mandates
FOR EACH ROW
WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
EXECUTE FUNCTION public.sync_candidatures_on_assignment_change();

-- 4. Add unique constraint for mandate_interests (one interest per investigator per mandate)
ALTER TABLE public.mandate_interests
DROP CONSTRAINT IF EXISTS unique_investigator_mandate_interest;

-- First check if there are duplicates and remove them
DELETE FROM public.mandate_interests a
USING public.mandate_interests b
WHERE a.id > b.id 
  AND a.mandate_id = b.mandate_id 
  AND a.investigator_id = b.investigator_id;

ALTER TABLE public.mandate_interests
ADD CONSTRAINT unique_investigator_mandate_interest 
UNIQUE (mandate_id, investigator_id);

-- 5. Enable RLS on critical tables that were missing it
ALTER TABLE public.investigator_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandate_ratings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for investigator_favorites
DROP POLICY IF EXISTS "Agency owners can manage their favorites" ON public.investigator_favorites;
CREATE POLICY "Agency owners can manage their favorites"
ON public.investigator_favorites
FOR ALL
TO authenticated
USING (
  agency_id IN (SELECT id FROM public.agencies WHERE owner_id = auth.uid())
);

-- 7. Create RLS policies for investigator_stats (read-only for everyone)
DROP POLICY IF EXISTS "Everyone can view investigator stats" ON public.investigator_stats;
CREATE POLICY "Everyone can view investigator stats"
ON public.investigator_stats
FOR SELECT
TO authenticated
USING (true);

-- 8. Create RLS policies for mandate_ratings
DROP POLICY IF EXISTS "Agency owners can manage ratings" ON public.mandate_ratings;
CREATE POLICY "Agency owners can manage ratings"
ON public.mandate_ratings
FOR ALL
TO authenticated
USING (
  agency_id IN (SELECT id FROM public.agencies WHERE owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Everyone can view ratings" ON public.mandate_ratings;
CREATE POLICY "Everyone can view ratings"
ON public.mandate_ratings
FOR SELECT
TO authenticated
USING (true);

-- 9. Add index for faster candidature lookups
CREATE INDEX IF NOT EXISTS idx_mandate_interests_mandate_status 
ON public.mandate_interests (mandate_id, status);

CREATE INDEX IF NOT EXISTS idx_mandate_interests_investigator_status 
ON public.mandate_interests (investigator_id, status);

COMMENT ON CONSTRAINT check_mandate_assignment_consistency ON public.mandates 
IS 'Ensures mandate status is consistent with assigned_to field';

COMMENT ON CONSTRAINT unique_investigator_mandate_interest ON public.mandate_interests 
IS 'Ensures one interest record per investigator per mandate';
