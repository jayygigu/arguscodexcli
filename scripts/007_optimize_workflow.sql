-- =====================================================
-- SCRIPT: Optimize Workflow Process
-- Purpose: Remove unused statuses and add missing capabilities
-- =====================================================

-- 1. Remove the unused "assigned" status from the constraint
-- The system skips directly from "open" to "in-progress"
ALTER TABLE public.mandates
DROP CONSTRAINT IF EXISTS mandates_status_check;

ALTER TABLE public.mandates
ADD CONSTRAINT mandates_status_check 
CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled', 'expired'));

-- 2. Remove unused candidature statuses from constraint
ALTER TABLE public.mandate_interests
DROP CONSTRAINT IF EXISTS mandate_interests_status_check;

ALTER TABLE public.mandate_interests
ADD CONSTRAINT mandate_interests_status_check 
CHECK (status IN ('interested', 'accepted', 'rejected'));

-- 3. Improved trigger for syncing candidatures
-- Now handles unassignment by resetting accepted candidature to interested
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
    
    -- Reject other interested candidatures (not previously rejected ones)
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
    
    -- Note: rejected candidatures remain rejected unless explicitly unrejected
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Add index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_mandates_status_agency 
ON public.mandates (agency_id, status);

-- 5. Add index for candidature status lookups
CREATE INDEX IF NOT EXISTS idx_mandate_interests_status 
ON public.mandate_interests (status);

-- 6. Add comments for documentation
COMMENT ON CONSTRAINT mandates_status_check ON public.mandates 
IS 'Valid mandate statuses: open (awaiting assignment), in-progress (work ongoing), completed, cancelled, expired';

COMMENT ON CONSTRAINT mandate_interests_status_check ON public.mandate_interests 
IS 'Valid candidature statuses: interested (pending), accepted (assigned), rejected';
