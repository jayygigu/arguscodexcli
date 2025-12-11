-- ============================================================================
-- SOLUTION FINALE - RLS POLICIES POUR MESSAGES
-- ============================================================================
-- Ce script résout définitivement le problème de récursion infinie
-- et permet aux agences et enquêteurs de voir leurs messages
-- ============================================================================

BEGIN;

-- ============================================================================
-- ÉTAPE 1: Nettoyer toutes les anciennes policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view messages they are part of" ON public.messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update message status" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Enable read access for message participants" ON public.messages;
DROP POLICY IF EXISTS "Enable update for message participants" ON public.messages;

-- ============================================================================
-- ÉTAPE 2: Créer les policies simples et fonctionnelles
-- ============================================================================

-- Policy 1: SELECT - Voir les messages
-- Un utilisateur peut voir un message si:
-- 1. Il est l'expéditeur du message (sender_id = auth.uid())
-- 2. OU il possède l'agence (owner_id dans agencies)
-- 3. OU il est intéressé par le mandat (dans mandate_interests)
CREATE POLICY "messages_select_policy" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  -- L'utilisateur est l'expéditeur
  sender_id = auth.uid()
  OR
  -- L'utilisateur possède l'agence
  EXISTS (
    SELECT 1 
    FROM public.agencies 
    WHERE agencies.id = messages.agency_id 
      AND agencies.owner_id = auth.uid()
  )
  OR
  -- L'utilisateur est intéressé par le mandat (pour les messages liés à un mandat)
  (
    messages.mandate_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.mandate_interests 
      WHERE mandate_interests.mandate_id = messages.mandate_id 
        AND mandate_interests.investigator_id = auth.uid()
    )
  )
);

-- Policy 2: INSERT - Envoyer des messages
-- Un utilisateur peut envoyer un message si:
-- 1. Il est l'expéditeur (sender_id = auth.uid())
-- 2. ET (il possède l'agence OU il est intéressé par le mandat)
CREATE POLICY "messages_insert_policy" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- L'utilisateur doit être l'expéditeur
  sender_id = auth.uid()
  AND
  (
    -- L'utilisateur possède l'agence
    EXISTS (
      SELECT 1 
      FROM public.agencies 
      WHERE agencies.id = messages.agency_id 
        AND agencies.owner_id = auth.uid()
    )
    OR
    -- L'utilisateur est intéressé par le mandat (pour les messages liés à un mandat)
    (
      messages.mandate_id IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM public.mandate_interests 
        WHERE mandate_interests.mandate_id = messages.mandate_id 
          AND mandate_interests.investigator_id = auth.uid()
      )
    )
    OR
    -- Conversation directe (pas de mandate_id) - l'enquêteur peut envoyer
    (
      messages.mandate_id IS NULL
      AND messages.sender_type = 'investigator'
    )
  )
);

-- Policy 3: UPDATE - Mettre à jour le statut de lecture
-- Un utilisateur peut mettre à jour un message si:
-- 1. Il possède l'agence (pour marquer comme lu)
-- 2. OU il est intéressé par le mandat (pour marquer comme lu)
CREATE POLICY "messages_update_policy" 
ON public.messages 
FOR UPDATE 
TO authenticated
USING (
  -- L'utilisateur possède l'agence
  EXISTS (
    SELECT 1 
    FROM public.agencies 
    WHERE agencies.id = messages.agency_id 
      AND agencies.owner_id = auth.uid()
  )
  OR
  -- L'utilisateur est intéressé par le mandat
  (
    messages.mandate_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.mandate_interests 
      WHERE mandate_interests.mandate_id = messages.mandate_id 
        AND mandate_interests.investigator_id = auth.uid()
    )
  )
  OR
  -- Conversation directe - l'enquêteur peut mettre à jour
  (
    messages.mandate_id IS NULL
    AND sender_id != auth.uid()
  )
)
WITH CHECK (
  -- Même conditions que USING
  EXISTS (
    SELECT 1 
    FROM public.agencies 
    WHERE agencies.id = messages.agency_id 
      AND agencies.owner_id = auth.uid()
  )
  OR
  (
    messages.mandate_id IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.mandate_interests 
      WHERE mandate_interests.mandate_id = messages.mandate_id 
        AND mandate_interests.investigator_id = auth.uid()
    )
  )
  OR
  (
    messages.mandate_id IS NULL
    AND sender_id != auth.uid()
  )
);

-- ============================================================================
-- ÉTAPE 3: Créer les index pour optimiser les performances
-- ============================================================================

-- Index pour les requêtes par agency_id
CREATE INDEX IF NOT EXISTS idx_messages_agency_id 
ON public.messages(agency_id);

-- Index pour les requêtes par mandate_id
CREATE INDEX IF NOT EXISTS idx_messages_mandate_id 
ON public.messages(mandate_id) 
WHERE mandate_id IS NOT NULL;

-- Index pour les requêtes par sender_id
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON public.messages(sender_id);

-- Index pour les messages non lus
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON public.messages(agency_id, read) 
WHERE read = false;

-- Index pour trier par date
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON public.messages(created_at DESC);

-- Index composite pour les conversations directes
CREATE INDEX IF NOT EXISTS idx_messages_direct_conversations 
ON public.messages(agency_id, mandate_id, created_at DESC) 
WHERE mandate_id IS NULL;

-- ============================================================================
-- ÉTAPE 4: Activer Realtime pour la table messages
-- ============================================================================

-- Activer la réplication Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================================================
-- ÉTAPE 5: Vérifier que RLS est activé
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
-- Pour vérifier que les policies sont bien créées, exécutez:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'messages';
-- ============================================================================
