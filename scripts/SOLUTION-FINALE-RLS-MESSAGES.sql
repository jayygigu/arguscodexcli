-- ============================================================================
-- SOLUTION FINALE - RLS POLICIES POUR MESSAGES
-- ============================================================================
-- La table messages utilise investigator_id (PAS mandate_id)
-- Structure: agency_id, investigator_id, sender_id, sender_type, content, etc.
-- ============================================================================

BEGIN;

-- ============================================================================
-- ÉTAPE 1: Nettoyer toutes les anciennes policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view messages they are part of" ON public.messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update message status" ON public.messages;
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Enable read access for message participants" ON public.messages;
DROP POLICY IF EXISTS "Enable update for message participants" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;

-- ============================================================================
-- ÉTAPE 2: Créer les policies simples et fonctionnelles
-- ============================================================================

-- Policy 1: SELECT - Voir les messages
-- Un utilisateur peut voir un message si:
-- 1. Il est l'expéditeur du message (sender_id = auth.uid())
-- 2. OU il possède l'agence (owner_id dans agencies)
-- 3. OU il est l'enquêteur dans la conversation (investigator_id = auth.uid())
CREATE POLICY "messages_select_policy" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  sender_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 
    FROM public.agencies 
    WHERE agencies.id = messages.agency_id 
      AND agencies.owner_id = auth.uid()
  )
  OR
  investigator_id = auth.uid()
);

-- Policy 2: INSERT - Envoyer des messages
-- Un utilisateur peut envoyer un message si:
-- 1. Il est l'expéditeur (sender_id = auth.uid())
-- 2. ET (il possède l'agence OU il est l'enquêteur dans la conversation)
CREATE POLICY "messages_insert_policy" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND
  (
    EXISTS (
      SELECT 1 
      FROM public.agencies 
      WHERE agencies.id = messages.agency_id 
        AND agencies.owner_id = auth.uid()
    )
    OR
    investigator_id = auth.uid()
  )
);

-- Policy 3: UPDATE - Mettre à jour le statut de lecture
-- Un utilisateur peut mettre à jour un message si:
-- 1. Il possède l'agence
-- 2. OU il est l'enquêteur dans la conversation
CREATE POLICY "messages_update_policy" 
ON public.messages 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.agencies 
    WHERE agencies.id = messages.agency_id 
      AND agencies.owner_id = auth.uid()
  )
  OR
  investigator_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.agencies 
    WHERE agencies.id = messages.agency_id 
      AND agencies.owner_id = auth.uid()
  )
  OR
  investigator_id = auth.uid()
);

-- ============================================================================
-- ÉTAPE 3: Créer les index pour optimiser les performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_agency_id ON public.messages(agency_id);
CREATE INDEX IF NOT EXISTS idx_messages_investigator_id ON public.messages(investigator_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(agency_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(agency_id, investigator_id, created_at DESC);

-- ============================================================================
-- ÉTAPE 4: Activer Realtime pour la table messages (avec gestion d'erreur)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- ÉTAPE 5: Vérifier que RLS est activé
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

COMMIT;
