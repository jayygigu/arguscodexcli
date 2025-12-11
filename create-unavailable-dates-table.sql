-- Create unavailable_dates table
CREATE TABLE IF NOT EXISTS public.unavailable_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_unavailable_dates_profile_id ON public.unavailable_dates(profile_id);
CREATE INDEX IF NOT EXISTS idx_unavailable_dates_date ON public.unavailable_dates(date);

-- Enable Row Level Security
ALTER TABLE public.unavailable_dates ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own unavailable dates
CREATE POLICY "Users can view their own unavailable dates"
  ON public.unavailable_dates
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Allow users to insert their own unavailable dates
CREATE POLICY "Users can insert their own unavailable dates"
  ON public.unavailable_dates
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Allow users to delete their own unavailable dates
CREATE POLICY "Users can delete their own unavailable dates"
  ON public.unavailable_dates
  FOR DELETE
  USING (auth.uid() = profile_id);
