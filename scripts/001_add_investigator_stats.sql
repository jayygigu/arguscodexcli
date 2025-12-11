-- Create investigator statistics tables
CREATE TABLE IF NOT EXISTS public.investigator_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  investigator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_mandates_completed integer DEFAULT 0,
  total_mandates_in_progress integer DEFAULT 0,
  average_rating numeric(3,2),
  total_ratings integer DEFAULT 0,
  response_time_hours numeric(5,2),
  completion_rate numeric(5,2) DEFAULT 100.0,
  on_time_rate numeric(5,2) DEFAULT 100.0,
  last_mandate_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investigator_stats_pkey PRIMARY KEY (id),
  CONSTRAINT investigator_stats_investigator_id_key UNIQUE (investigator_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_investigator_stats_investigator_id ON public.investigator_stats(investigator_id);
CREATE INDEX IF NOT EXISTS idx_investigator_stats_rating ON public.investigator_stats(average_rating DESC);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.investigator_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  investigator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT investigator_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT investigator_favorites_unique UNIQUE (agency_id, investigator_id)
);

-- Create index for favorites
CREATE INDEX IF NOT EXISTS idx_investigator_favorites_agency ON public.investigator_favorites(agency_id);
CREATE INDEX IF NOT EXISTS idx_investigator_favorites_investigator ON public.investigator_favorites(investigator_id);

-- Create mandate ratings table
CREATE TABLE IF NOT EXISTS public.mandate_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL REFERENCES public.mandates(id) ON DELETE CASCADE,
  investigator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  on_time boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mandate_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT mandate_ratings_mandate_unique UNIQUE (mandate_id)
);

-- Create index for ratings
CREATE INDEX IF NOT EXISTS idx_mandate_ratings_investigator ON public.mandate_ratings(investigator_id);
CREATE INDEX IF NOT EXISTS idx_mandate_ratings_agency ON public.mandate_ratings(agency_id);

-- Function to update investigator stats after mandate completion
CREATE OR REPLACE FUNCTION public.update_investigator_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats when mandate is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.investigator_stats (investigator_id, total_mandates_completed, last_mandate_date)
    VALUES (NEW.assigned_to, 1, NEW.updated_at)
    ON CONFLICT (investigator_id)
    DO UPDATE SET
      total_mandates_completed = investigator_stats.total_mandates_completed + 1,
      last_mandate_date = NEW.updated_at,
      updated_at = now();
  END IF;
  
  -- Update in-progress count
  IF NEW.status = 'in-progress' AND OLD.status != 'in-progress' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.investigator_stats (investigator_id, total_mandates_in_progress)
    VALUES (NEW.assigned_to, 1)
    ON CONFLICT (investigator_id)
    DO UPDATE SET
      total_mandates_in_progress = investigator_stats.total_mandates_in_progress + 1,
      updated_at = now();
  ELSIF OLD.status = 'in-progress' AND NEW.status != 'in-progress' AND NEW.assigned_to IS NOT NULL THEN
    UPDATE public.investigator_stats
    SET total_mandates_in_progress = GREATEST(0, total_mandates_in_progress - 1),
        updated_at = now()
    WHERE investigator_id = NEW.assigned_to;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating stats
DROP TRIGGER IF EXISTS trigger_update_investigator_stats ON public.mandates;
CREATE TRIGGER trigger_update_investigator_stats
AFTER UPDATE ON public.mandates
FOR EACH ROW
EXECUTE FUNCTION public.update_investigator_stats();

-- Function to update ratings stats
CREATE OR REPLACE FUNCTION public.update_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.investigator_stats
  SET 
    average_rating = (
      SELECT AVG(rating)::numeric(3,2)
      FROM public.mandate_ratings
      WHERE investigator_id = NEW.investigator_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.mandate_ratings
      WHERE investigator_id = NEW.investigator_id
    ),
    on_time_rate = (
      SELECT (COUNT(*) FILTER (WHERE on_time = true)::numeric / NULLIF(COUNT(*), 0) * 100)::numeric(5,2)
      FROM public.mandate_ratings
      WHERE investigator_id = NEW.investigator_id
    ),
    updated_at = now()
  WHERE investigator_id = NEW.investigator_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rating stats
DROP TRIGGER IF EXISTS trigger_update_rating_stats ON public.mandate_ratings;
CREATE TRIGGER trigger_update_rating_stats
AFTER INSERT OR UPDATE ON public.mandate_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_rating_stats();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.investigator_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigator_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mandate_ratings TO authenticated;
