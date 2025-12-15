-- =====================================================
-- SCRIPT CONSOLIDÉ: TOUTES LES AMÉLIORATIONS ARGUS
-- Exécutez ce script une seule fois sur votre base de données
-- Date: Session actuelle
-- =====================================================

-- =====================================================
-- PARTIE 1: TABLES SUPPLÉMENTAIRES
-- =====================================================

-- Table des stats enquêteurs
CREATE TABLE IF NOT EXISTS public.investigator_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_mandates_completed INTEGER DEFAULT 0,
  total_mandates_in_progress INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  on_time_rate NUMERIC(5,2) DEFAULT 100,
  last_mandate_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(investigator_id)
);

-- Table des favoris agence->enquêteur
CREATE TABLE IF NOT EXISTS public.investigator_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  investigator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agency_id, investigator_id)
);

-- Table des évaluations de mandats
CREATE TABLE IF NOT EXISTS public.mandate_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  investigator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mandate_id)
);

-- =====================================================
-- PARTIE 2: CONTRAINTES ET INDEX
-- =====================================================

-- Nettoyer les statuts invalides AVANT d'ajouter les contraintes

-- D'abord, supprimer les anciennes contraintes si elles existent
ALTER TABLE public.mandates DROP CONSTRAINT IF EXISTS mandates_status_check;
ALTER TABLE public.mandates DROP CONSTRAINT IF EXISTS check_mandate_assignment_consistency;

-- Nettoyer les statuts invalides dans mandates
UPDATE public.mandates 
SET status = 'open' 
WHERE status IS NULL OR status = '' OR TRIM(status) = '';

UPDATE public.mandates 
SET status = 'cancelled' 
WHERE status NOT IN ('draft', 'open', 'pending', 'in-progress', 'completed', 'cancelled', 'expired', 'disputed');

-- Corriger la cohérence assigned_to / status
UPDATE public.mandates 
SET assigned_to = NULL 
WHERE status IN ('open', 'pending') AND assigned_to IS NOT NULL;

UPDATE public.mandates 
SET status = 'in-progress' 
WHERE status NOT IN ('in-progress', 'completed', 'cancelled', 'expired', 'disputed') AND assigned_to IS NOT NULL;

-- Maintenant ajouter la contrainte de statuts valides (incluant 'draft' et 'disputed')
ALTER TABLE public.mandates
ADD CONSTRAINT mandates_status_check 
CHECK (status IN ('draft', 'open', 'pending', 'assigned', 'in-progress', 'completed', 'cancelled', 'expired', 'disputed'));

-- Nettoyer les statuts invalides dans mandate_interests AVANT d'ajouter la contrainte
ALTER TABLE public.mandate_interests DROP CONSTRAINT IF EXISTS mandate_interests_status_check;

UPDATE public.mandate_interests 
SET status = 'interested' 
WHERE status IS NULL OR status = '' OR TRIM(status) = '';

UPDATE public.mandate_interests 
SET status = 'rejected' 
WHERE status NOT IN ('interested', 'accepted', 'rejected');

-- Contrainte de statuts valides pour candidatures
ALTER TABLE public.mandate_interests
ADD CONSTRAINT mandate_interests_status_check 
CHECK (status IN ('interested', 'accepted', 'rejected'));

-- Contrainte de cohérence mandat/assignation (ajoutée APRÈS nettoyage)
ALTER TABLE public.mandates
ADD CONSTRAINT check_mandate_assignment_consistency
CHECK (
  (status = 'in-progress' AND assigned_to IS NOT NULL)
  OR (status IN ('open', 'pending') AND assigned_to IS NULL)
  OR (status NOT IN ('open', 'pending', 'in-progress'))
);

-- Une seule candidature acceptée par mandat
DROP INDEX IF EXISTS idx_mandate_interests_unique_accepted;
CREATE UNIQUE INDEX idx_mandate_interests_unique_accepted
ON public.mandate_interests (mandate_id)
WHERE status = 'accepted';

-- Un seul intérêt par enquêteur par mandat
DELETE FROM public.mandate_interests a
USING public.mandate_interests b
WHERE a.id > b.id 
  AND a.mandate_id = b.mandate_id 
  AND a.investigator_id = b.investigator_id;

ALTER TABLE public.mandate_interests
DROP CONSTRAINT IF EXISTS unique_investigator_mandate_interest;

ALTER TABLE public.mandate_interests
ADD CONSTRAINT unique_investigator_mandate_interest 
UNIQUE (mandate_id, investigator_id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_mandates_status_agency ON public.mandates (agency_id, status);
CREATE INDEX IF NOT EXISTS idx_mandates_date_required_status ON public.mandates (date_required, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_mandate_interests_status ON public.mandate_interests (status);
CREATE INDEX IF NOT EXISTS idx_mandate_interests_mandate_status ON public.mandate_interests (mandate_id, status);
CREATE INDEX IF NOT EXISTS idx_mandate_interests_investigator_status ON public.mandate_interests (investigator_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_coordinates ON public.profiles (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mandates_coordinates ON public.mandates (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investigator_stats_investigator_id ON public.investigator_stats(investigator_id);
CREATE INDEX IF NOT EXISTS idx_investigator_stats_rating ON public.investigator_stats(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_investigator_favorites_agency ON public.investigator_favorites(agency_id);
CREATE INDEX IF NOT EXISTS idx_investigator_favorites_investigator ON public.investigator_favorites(investigator_id);
CREATE INDEX IF NOT EXISTS idx_mandate_ratings_investigator ON public.mandate_ratings(investigator_id);
CREATE INDEX IF NOT EXISTS idx_mandate_ratings_agency ON public.mandate_ratings(agency_id);

-- =====================================================
-- PARTIE 3: FONCTIONS
-- =====================================================

-- Fonction: Calculer distance entre 2 points (Haversine)
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 NUMERIC, lon1 NUMERIC,
  lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN ROUND(
    (6371 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) * 
      cos(radians(lon2) - radians(lon1)) + 
      sin(radians(lat1)) * sin(radians(lat2))
    ))::NUMERIC, 1
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction: Expirer les mandats passés
CREATE OR REPLACE FUNCTION public.expire_past_mandates()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.mandates
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'open' AND date_required < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Sync candidatures lors de l'assignation
CREATE OR REPLACE FUNCTION public.sync_candidatures_on_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mandate_interests 
      WHERE mandate_id = NEW.id AND investigator_id = NEW.assigned_to AND status = 'accepted'
    ) THEN
      INSERT INTO public.mandate_interests (mandate_id, investigator_id, status, created_at, updated_at)
      VALUES (NEW.id, NEW.assigned_to, 'accepted', now(), now())
      ON CONFLICT (mandate_id, investigator_id) 
      DO UPDATE SET status = 'accepted', updated_at = now();
    END IF;
    
    UPDATE public.mandate_interests
    SET status = 'rejected', updated_at = now()
    WHERE mandate_id = NEW.id AND investigator_id != NEW.assigned_to AND status = 'interested';
  
  ELSIF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL THEN
    UPDATE public.mandate_interests
    SET status = 'interested', updated_at = now()
    WHERE mandate_id = NEW.id AND investigator_id = OLD.assigned_to AND status = 'accepted';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: MAJ auto des stats enquêteur à la complétion
CREATE OR REPLACE FUNCTION public.update_investigator_stats_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_investigator_id UUID;
  v_was_on_time BOOLEAN;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_to IS NOT NULL THEN
    v_investigator_id := NEW.assigned_to;
    v_was_on_time := NEW.updated_at <= NEW.date_required;
    
    INSERT INTO public.investigator_stats (
      investigator_id, total_mandates_completed, total_mandates_in_progress,
      last_mandate_date, on_time_rate, created_at, updated_at
    ) VALUES (
      v_investigator_id, 1, 0, NOW(),
      CASE WHEN v_was_on_time THEN 100 ELSE 0 END, NOW(), NOW()
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
  
  ELSIF NEW.status = 'in-progress' AND OLD.status != 'in-progress' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.investigator_stats (
      investigator_id, total_mandates_in_progress, total_mandates_completed, created_at, updated_at
    ) VALUES (NEW.assigned_to, 1, 0, NOW(), NOW())
    ON CONFLICT (investigator_id) DO UPDATE SET
      total_mandates_in_progress = investigator_stats.total_mandates_in_progress + 1,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction: MAJ stats après notation
CREATE OR REPLACE FUNCTION public.update_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.investigator_stats
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0) 
      FROM public.mandate_ratings 
      WHERE investigator_id = NEW.investigator_id
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM public.mandate_ratings 
      WHERE investigator_id = NEW.investigator_id
    ),
    updated_at = now()
  WHERE investigator_id = NEW.investigator_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.investigator_stats (investigator_id, average_rating, total_reviews)
    VALUES (NEW.investigator_id, NEW.rating, 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTIE 4: TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_sync_candidatures_on_assignment ON public.mandates;
CREATE TRIGGER trigger_sync_candidatures_on_assignment
AFTER UPDATE ON public.mandates
FOR EACH ROW
WHEN (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
EXECUTE FUNCTION public.sync_candidatures_on_assignment_change();

DROP TRIGGER IF EXISTS trigger_update_investigator_stats ON public.mandates;
CREATE TRIGGER trigger_update_investigator_stats
AFTER UPDATE ON public.mandates
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.update_investigator_stats_on_completion();

DROP TRIGGER IF EXISTS trigger_update_rating_stats ON public.mandate_ratings;
CREATE TRIGGER trigger_update_rating_stats
AFTER INSERT ON public.mandate_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_rating_stats();

-- =====================================================
-- PARTIE 5: VUE CANDIDATURES ENRICHIES
-- =====================================================

DROP VIEW IF EXISTS public.candidatures_with_details;
CREATE VIEW public.candidatures_with_details AS
SELECT 
  mi.id,
  mi.mandate_id,
  mi.investigator_id,
  mi.status,
  mi.created_at,
  mi.updated_at,
  m.title AS mandate_title,
  m.city AS mandate_city,
  m.region AS mandate_region,
  m.date_required,
  m.latitude AS mandate_lat,
  m.longitude AS mandate_lon,
  m.agency_id,
  p.name AS investigator_name,
  p.city AS investigator_city,
  p.region AS investigator_region,
  p.latitude AS investigator_lat,
  p.longitude AS investigator_lon,
  p.availability_status,
  public.calculate_distance_km(m.latitude, m.longitude, p.latitude, p.longitude) AS distance_km,
  EXTRACT(DAY FROM (m.date_required - NOW())) AS days_until_required,
  CASE 
    WHEN m.date_required <= NOW() + INTERVAL '48 hours' THEN 'critical'
    WHEN m.date_required <= NOW() + INTERVAL '7 days' THEN 'urgent'
    ELSE 'normal'
  END AS urgency_level,
  COALESCE(ist.average_rating, 0) AS investigator_rating,
  COALESCE(ist.total_mandates_completed, 0) AS investigator_completed_mandates
FROM public.mandate_interests mi
JOIN public.mandates m ON m.id = mi.mandate_id
JOIN public.profiles p ON p.id = mi.investigator_id
LEFT JOIN public.investigator_stats ist ON ist.investigator_id = mi.investigator_id;

GRANT SELECT ON public.candidatures_with_details TO authenticated;

-- =====================================================
-- PARTIE 6: RLS (Row Level Security)
-- =====================================================

ALTER TABLE public.investigator_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandate_ratings ENABLE ROW LEVEL SECURITY;

-- Politiques investigator_favorites
DROP POLICY IF EXISTS "Agency owners can manage their favorites" ON public.investigator_favorites;
CREATE POLICY "Agency owners can manage their favorites"
ON public.investigator_favorites FOR ALL TO authenticated
USING (agency_id IN (SELECT id FROM public.agencies WHERE owner_id = auth.uid()));

-- Politiques investigator_stats
DROP POLICY IF EXISTS "Everyone can view investigator stats" ON public.investigator_stats;
CREATE POLICY "Everyone can view investigator stats"
ON public.investigator_stats FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "System can update investigator stats" ON public.investigator_stats;
CREATE POLICY "System can update investigator stats"
ON public.investigator_stats FOR ALL TO authenticated USING (true);

-- Politiques mandate_ratings
DROP POLICY IF EXISTS "Agency owners can manage ratings" ON public.mandate_ratings;
CREATE POLICY "Agency owners can manage ratings"
ON public.mandate_ratings FOR ALL TO authenticated
USING (agency_id IN (SELECT id FROM public.agencies WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Everyone can view ratings" ON public.mandate_ratings;
CREATE POLICY "Everyone can view ratings"
ON public.mandate_ratings FOR SELECT TO authenticated USING (true);

-- =====================================================
-- PARTIE 7: COMMENTAIRES
-- =====================================================

COMMENT ON VIEW public.candidatures_with_details IS 'Candidatures enrichies avec distance, urgence et stats enquêteur';
COMMENT ON FUNCTION public.calculate_distance_km IS 'Calcule la distance en km entre deux points lat/lon (Haversine)';
COMMENT ON FUNCTION public.expire_past_mandates IS 'Expire les mandats ouverts passés - à appeler via cron';
COMMENT ON CONSTRAINT check_mandate_assignment_consistency ON public.mandates IS 'Assure cohérence entre statut et assigned_to';
COMMENT ON CONSTRAINT unique_investigator_mandate_interest ON public.mandate_interests IS 'Un seul intérêt par enquêteur par mandat';

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
