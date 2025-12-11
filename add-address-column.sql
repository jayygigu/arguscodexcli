-- Ajouter la colonne address à la table profiles pour stocker l'adresse postale de correspondance
-- Cette adresse est utilisée pour l'administration et le courrier postal
-- Le calcul de distance pour les mandats utilise toujours la position GPS en temps réel

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN public.profiles.address IS 'Adresse postale complète pour correspondance administrative';
