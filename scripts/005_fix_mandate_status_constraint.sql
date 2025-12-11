-- Fix mandate status check constraint to allow correct statuses
-- Drop the existing check constraint if it exists
ALTER TABLE mandates DROP CONSTRAINT IF EXISTS mandates_status_check;

-- Add the correct check constraint with all valid statuses
ALTER TABLE mandates ADD CONSTRAINT mandates_status_check 
CHECK (status IN ('open', 'assigned', 'in-progress', 'completed', 'cancelled', 'expired'));

-- Ensure the assignment_type constraint is also correct
ALTER TABLE mandates DROP CONSTRAINT IF EXISTS mandates_assignment_type_check;
ALTER TABLE mandates ADD CONSTRAINT mandates_assignment_type_check 
CHECK (assignment_type IN ('direct', 'public'));

-- Ensure the priority constraint is correct
ALTER TABLE mandates DROP CONSTRAINT IF EXISTS mandates_priority_check;
ALTER TABLE mandates ADD CONSTRAINT mandates_priority_check 
CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
