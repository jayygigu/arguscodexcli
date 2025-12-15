-- ============================================
-- ARGUS - Configuration complète de la base de données
-- ============================================
-- Ce script configure :
-- 1. Les politiques RLS (Row Level Security)
-- 2. Les triggers pour création automatique
-- 3. Les index pour performance
-- ============================================

-- ============================================
-- 1. POLITIQUES RLS - PROFILES
-- ============================================

-- Activer RLS sur profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Tout le monde peut voir les profils
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. POLITIQUES RLS - AGENCIES
-- ============================================

-- Activer RLS sur agencies
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Agencies are viewable by everyone" ON agencies;
DROP POLICY IF EXISTS "Users can insert their own agency" ON agencies;
DROP POLICY IF EXISTS "Owners can update their agency" ON agencies;
DROP POLICY IF EXISTS "Owners can delete their agency" ON agencies;

-- Tout le monde peut voir les agences
CREATE POLICY "Agencies are viewable by everyone"
  ON agencies FOR SELECT
  USING (true);

-- Les utilisateurs peuvent créer une agence où ils sont propriétaires
CREATE POLICY "Users can insert their own agency"
  ON agencies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Les propriétaires peuvent mettre à jour leur agence
CREATE POLICY "Owners can update their agency"
  ON agencies FOR UPDATE
  USING (auth.uid() = owner_id);

-- Les propriétaires peuvent supprimer leur agence
CREATE POLICY "Owners can delete their agency"
  ON agencies FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- 3. POLITIQUES RLS - MANDATES
-- ============================================

-- Activer RLS sur mandates
ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Mandates viewable by authenticated users" ON mandates;
DROP POLICY IF EXISTS "Agencies can create mandates" ON mandates;
DROP POLICY IF EXISTS "Agencies can update their mandates" ON mandates;
DROP POLICY IF EXISTS "Agencies can delete their mandates" ON mandates;

-- Les utilisateurs authentifiés peuvent voir les mandats
CREATE POLICY "Mandates viewable by authenticated users"
  ON mandates FOR SELECT
  TO authenticated
  USING (true);

-- Les agences peuvent créer des mandats
CREATE POLICY "Agencies can create mandates"
  ON mandates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  );

-- Les agences peuvent mettre à jour leurs mandats
CREATE POLICY "Agencies can update their mandates"
  ON mandates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  );

-- Les agences peuvent supprimer leurs mandats
CREATE POLICY "Agencies can delete their mandates"
  ON mandates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  );

-- ============================================
-- 4. POLITIQUES RLS - MESSAGES
-- ============================================

-- Activer RLS sur messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view messages they are part of" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

-- Fixed: removed mandate_id reference, use agency_id and investigator_id instead
-- Les utilisateurs peuvent voir les messages dont ils font partie
CREATE POLICY "Users can view messages they are part of"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() 
    OR investigator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  );

-- Les utilisateurs peuvent envoyer des messages
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs messages (pour marquer comme lu)
CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid() 
    OR investigator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  );

-- ============================================
-- 5. POLITIQUES RLS - NOTIFICATIONS
-- ============================================

-- Activer RLS sur notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs propres notifications
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- 6. POLITIQUES RLS - MANDATE_INTERESTS
-- ============================================

-- Activer RLS sur mandate_interests
ALTER TABLE mandate_interests ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view mandate interests" ON mandate_interests;
DROP POLICY IF EXISTS "Investigators can express interest" ON mandate_interests;
DROP POLICY IF EXISTS "Investigators can withdraw interest" ON mandate_interests;
DROP POLICY IF EXISTS "Investigators can update their interest" ON mandate_interests;

-- Les utilisateurs authentifiés peuvent voir les intérêts
CREATE POLICY "Users can view mandate interests"
  ON mandate_interests FOR SELECT
  TO authenticated
  USING (true);

-- Les enquêteurs peuvent exprimer leur intérêt
CREATE POLICY "Investigators can express interest"
  ON mandate_interests FOR INSERT
  TO authenticated
  WITH CHECK (investigator_id = auth.uid());

-- Les enquêteurs peuvent mettre à jour leur intérêt
CREATE POLICY "Investigators can update their interest"
  ON mandate_interests FOR UPDATE
  TO authenticated
  USING (investigator_id = auth.uid());

-- Les enquêteurs peuvent retirer leur intérêt
CREATE POLICY "Investigators can withdraw interest"
  ON mandate_interests FOR DELETE
  TO authenticated
  USING (investigator_id = auth.uid());

-- ============================================
-- 7. POLITIQUES RLS - UNAVAILABLE_DATES
-- ============================================

-- Activer RLS sur unavailable_dates
ALTER TABLE unavailable_dates ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view unavailable dates" ON unavailable_dates;
DROP POLICY IF EXISTS "Users can manage their own unavailable dates" ON unavailable_dates;

-- Tout le monde peut voir les dates indisponibles
CREATE POLICY "Users can view unavailable dates"
  ON unavailable_dates FOR SELECT
  USING (true);

-- Les utilisateurs peuvent gérer leurs propres dates
CREATE POLICY "Users can manage their own unavailable dates"
  ON unavailable_dates FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ============================================
-- 8. POLITIQUES RLS - PROFILE_SPECIALTIES
-- ============================================

-- Activer RLS sur profile_specialties
ALTER TABLE profile_specialties ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Everyone can view profile specialties" ON profile_specialties;
DROP POLICY IF EXISTS "Users can manage their own specialties" ON profile_specialties;

-- Tout le monde peut voir les spécialités
CREATE POLICY "Everyone can view profile specialties"
  ON profile_specialties FOR SELECT
  USING (true);

-- Les utilisateurs peuvent gérer leurs propres spécialités
CREATE POLICY "Users can manage their own specialties"
  ON profile_specialties FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ============================================
-- 9. POLITIQUES RLS - AGENCY_SPECIALTIES
-- ============================================

-- Activer RLS sur agency_specialties
ALTER TABLE agency_specialties ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Everyone can view agency specialties" ON agency_specialties;
DROP POLICY IF EXISTS "Agency owners can manage specialties" ON agency_specialties;

-- Tout le monde peut voir les spécialités d'agence
CREATE POLICY "Everyone can view agency specialties"
  ON agency_specialties FOR SELECT
  USING (true);

-- Les propriétaires d'agence peuvent gérer les spécialités
CREATE POLICY "Agency owners can manage specialties"
  ON agency_specialties FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agencies 
      WHERE id = agency_id AND owner_id = auth.uid()
    )
  );

-- ============================================
-- 10. TRIGGER - Création automatique du profil ET de l'agence
-- ============================================

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Fonction améliorée pour distinguer les propriétaires d'agence des enquêteurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_agency_name text;
  v_agency_address text;
  v_agency_description text;
  v_is_agency boolean;
BEGIN
  -- Vérifier si c'est une inscription d'agence
  v_agency_name := new.raw_user_meta_data->>'agency_name';
  v_is_agency := (v_agency_name IS NOT NULL AND v_agency_name != '');

  -- Créer le profil utilisateur
  IF v_is_agency THEN
    -- Profil minimal pour propriétaire d'agence
    INSERT INTO public.profiles (id, name, email, phone)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', 'Utilisateur'),
      new.email,
      COALESCE(new.raw_user_meta_data->>'phone', null)
    );
  ELSE
    -- Profil complet pour enquêteur
    INSERT INTO public.profiles (
      id, name, email, phone, availability_status, years_experience
    )
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', 'Utilisateur'),
      new.email,
      COALESCE(new.raw_user_meta_data->>'phone', null),
      'available',
      0
    );
  END IF;

  -- Si un nom d'agence est fourni, créer l'agence automatiquement
  IF v_is_agency THEN
    v_agency_address := new.raw_user_meta_data->>'agency_address';
    v_agency_description := new.raw_user_meta_data->>'agency_description';
    
    INSERT INTO public.agencies (
      owner_id, name, contact_name, contact_phone, contact_email, contact_address, description
    )
    VALUES (
      new.id,
      v_agency_name,
      COALESCE(new.raw_user_meta_data->>'name', 'Contact'),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      new.email,
      v_agency_address,
      v_agency_description
    );
  END IF;

  RETURN new;
END;
$$;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 11. INDEX pour performance (idempotent)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_mandates_agency_id ON mandates(agency_id);
CREATE INDEX IF NOT EXISTS idx_mandates_status ON mandates(status);
CREATE INDEX IF NOT EXISTS idx_mandates_date_required ON mandates(date_required);
CREATE INDEX IF NOT EXISTS idx_mandates_created_at ON mandates(created_at DESC);

-- Fixed: use agency_id and investigator_id instead of mandate_id for messages
CREATE INDEX IF NOT EXISTS idx_messages_agency_id ON messages(agency_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_investigator_id ON messages(investigator_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mandate_interests_mandate_id ON mandate_interests(mandate_id);
CREATE INDEX IF NOT EXISTS idx_mandate_interests_investigator_id ON mandate_interests(investigator_id);
CREATE INDEX IF NOT EXISTS idx_mandate_interests_status ON mandate_interests(status);

CREATE INDEX IF NOT EXISTS idx_agencies_owner_id ON agencies(owner_id);

-- ============================================
-- 12. Contraintes supplémentaires (idempotent)
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_mandate_investigator'
  ) THEN
    ALTER TABLE mandate_interests 
    ADD CONSTRAINT unique_mandate_investigator 
    UNIQUE (mandate_id, investigator_id);
  END IF;
END $$;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
