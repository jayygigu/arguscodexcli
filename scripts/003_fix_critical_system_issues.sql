-- FIX 1: Add RLS policies for tables without protection
ALTER TABLE investigator_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_ratings ENABLE ROW LEVEL SECURITY;

-- RLS for investigator_favorites
CREATE POLICY "Agencies can manage their own favorites"
  ON investigator_favorites
  FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "All users can view favorites"
  ON investigator_favorites
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS for investigator_stats
CREATE POLICY "All users can view investigator stats"
  ON investigator_stats
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update investigator stats"
  ON investigator_stats
  FOR ALL
  TO authenticated
  USING (
    investigator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM mandates 
      WHERE assigned_to = investigator_stats.investigator_id
      AND agency_id IN (SELECT id FROM agencies WHERE owner_id = auth.uid())
    )
  );

-- RLS for mandate_ratings
CREATE POLICY "Agencies can rate their mandates"
  ON mandate_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT id FROM agencies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "All users can view ratings"
  ON mandate_ratings
  FOR SELECT
  TO authenticated
  USING (true);

-- FIX 2: Improve trigger to sync candidatures with assignation
CREATE OR REPLACE FUNCTION sync_candidatures_with_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- When assigned_to changes
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    
    -- If assigning to someone
    IF NEW.assigned_to IS NOT NULL THEN
      -- Set accepted for the assigned investigator
      UPDATE mandate_interests
      SET status = 'accepted', updated_at = now()
      WHERE mandate_id = NEW.id 
        AND investigator_id = NEW.assigned_to;
      
      -- Set rejected for all others
      UPDATE mandate_interests
      SET status = 'rejected', updated_at = now()
      WHERE mandate_id = NEW.id 
        AND investigator_id != NEW.assigned_to
        AND status = 'interested';
        
    -- If unassigning (assigned_to becomes null)
    ELSIF OLD.assigned_to IS NOT NULL THEN
      -- Reset all candidatures to interested
      UPDATE mandate_interests
      SET status = 'interested', updated_at = now()
      WHERE mandate_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_candidatures_trigger ON mandates;
CREATE TRIGGER sync_candidatures_trigger
  AFTER UPDATE ON mandates
  FOR EACH ROW
  EXECUTE FUNCTION sync_candidatures_with_assignment();

-- FIX 3: Function to create notifications automatically
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_mandate_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, mandate_id, read, created_at)
  VALUES (p_user_id, p_title, p_message, p_type, p_mandate_id, false, now());
END;
$$ LANGUAGE plpgsql;

-- FIX 4: Trigger to send notifications on candidature acceptance
CREATE OR REPLACE FUNCTION notify_candidature_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_investigator_profile_id uuid;
  v_mandate_title text;
BEGIN
  -- Get investigator profile user_id and mandate title
  SELECT id INTO v_investigator_profile_id
  FROM profiles WHERE id = NEW.investigator_id;
  
  SELECT title INTO v_mandate_title
  FROM mandates WHERE id = NEW.mandate_id;
  
  -- Notify on acceptance
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    PERFORM create_notification(
      v_investigator_profile_id,
      'Candidature acceptée',
      'Votre candidature pour "' || v_mandate_title || '" a été acceptée!',
      'candidature_accepted',
      NEW.mandate_id
    );
  END IF;
  
  -- Notify on rejection
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    PERFORM create_notification(
      v_investigator_profile_id,
      'Candidature refusée',
      'Votre candidature pour "' || v_mandate_title || '" a été refusée.',
      'candidature_rejected',
      NEW.mandate_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_candidature_trigger ON mandate_interests;
CREATE TRIGGER notify_candidature_trigger
  AFTER INSERT OR UPDATE ON mandate_interests
  FOR EACH ROW
  EXECUTE FUNCTION notify_candidature_changes();

-- FIX 5: Trigger to notify agency of new candidatures
CREATE OR REPLACE FUNCTION notify_new_candidature()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_owner_id uuid;
  v_investigator_name text;
  v_mandate_title text;
BEGIN
  -- Get agency owner
  SELECT owner_id INTO v_agency_owner_id
  FROM agencies a
  JOIN mandates m ON m.agency_id = a.id
  WHERE m.id = NEW.mandate_id;
  
  -- Get investigator name
  SELECT name INTO v_investigator_name
  FROM profiles WHERE id = NEW.investigator_id;
  
  -- Get mandate title
  SELECT title INTO v_mandate_title
  FROM mandates WHERE id = NEW.mandate_id;
  
  -- Send notification to agency
  PERFORM create_notification(
    v_agency_owner_id,
    'Nouvelle candidature',
    v_investigator_name || ' a postulé pour "' || v_mandate_title || '"',
    'new_candidature',
    NEW.mandate_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_new_candidature_trigger ON mandate_interests;
CREATE TRIGGER notify_new_candidature_trigger
  AFTER INSERT ON mandate_interests
  FOR EACH ROW
  WHEN (NEW.status = 'interested')
  EXECUTE FUNCTION notify_new_candidature();

-- FIX 6: Add mandate expiration logic
CREATE OR REPLACE FUNCTION expire_old_mandates()
RETURNS void AS $$
BEGIN
  UPDATE mandates
  SET status = 'expired', updated_at = now()
  WHERE status = 'open'
    AND date_required < CURRENT_DATE
    AND assigned_to IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_mandates TO authenticated;
