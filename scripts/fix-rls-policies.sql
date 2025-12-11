-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create RLS policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on agencies table
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agency owners can view their agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agency owners can update their agencies" ON public.agencies;
DROP POLICY IF EXISTS "Agency owners can insert their agencies" ON public.agencies;
DROP POLICY IF EXISTS "Authenticated users can create agencies" ON public.agencies;
DROP POLICY IF EXISTS "Public can view agencies" ON public.agencies;

-- Updated RLS policies to allow authenticated users to create agencies
-- Create RLS policies for agencies table
CREATE POLICY "Authenticated users can create agencies"
  ON public.agencies
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Agency owners can view their agencies"
  ON public.agencies
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Agency owners can update their agencies"
  ON public.agencies
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Public can view agencies"
  ON public.agencies
  FOR SELECT
  USING (true);
