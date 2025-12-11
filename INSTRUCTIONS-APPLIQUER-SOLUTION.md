# Instructions pour Appliquer la Solution RLS Messages

## 🎯 Objectif
Appliquer les policies RLS qui fonctionnent à 100% pour permettre aux agences et enquêteurs de voir leurs messages sans erreur de récursion infinie.

## 📋 Étapes à Suivre

### 1. Exécuter le Script SQL

Dans v0, cliquez sur le fichier `scripts/SOLUTION-FINALE-RLS-MESSAGES.sql` et cliquez sur "Run Script" (bouton play).

Le script va:
- ✅ Supprimer toutes les anciennes policies problématiques
- ✅ Créer 3 nouvelles policies simples et fonctionnelles
- ✅ Créer les index pour optimiser les performances
- ✅ Activer Realtime pour les messages
- ✅ Vérifier que RLS est activé

### 2. Vérifier que ça Fonctionne

Après avoir exécuté le script, testez:

#### Test 1: Interface Web Agence
1. Allez sur `/agence/messages`
2. Vous devriez voir la liste des conversations
3. Cliquez sur une conversation
4. Envoyez un message
5. ✅ Le message devrait s'envoyer sans erreur

#### Test 2: Application Mobile Enquêteur
1. Ouvrez l'app mobile
2. Allez dans Messages
3. Ouvrez une conversation avec une agence
4. ✅ Vous devriez voir les messages de l'agence
5. Envoyez un message
6. ✅ L'agence devrait le recevoir instantanément

#### Test 3: Temps Réel
1. Ouvrez l'interface web (agence) sur un écran
2. Ouvrez l'app mobile (enquêteur) sur un autre écran
3. Envoyez un message depuis l'un
4. ✅ Il devrait apparaître instantanément sur l'autre

### 3. Vérifier les Policies dans Supabase

Si vous voulez vérifier que les policies sont bien créées:

1. Allez dans Supabase Dashboard
2. Allez dans SQL Editor
3. Exécutez cette requête:

\`\`\`sql
SELECT 
  policyname, 
  cmd, 
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;
\`\`\`

Vous devriez voir 3 policies:
- `messages_select_policy` (SELECT)
- `messages_insert_policy` (INSERT)
- `messages_update_policy` (UPDATE)

## 🔍 Comment ça Fonctionne

### Policy SELECT (Voir les Messages)
Un utilisateur peut voir un message si:
1. **Il est l'expéditeur** (`sender_id = auth.uid()`)
2. **OU il possède l'agence** (vérifié dans la table `agencies`)
3. **OU il est intéressé par le mandat** (vérifié dans la table `mandate_interests`)

### Policy INSERT (Envoyer des Messages)
Un utilisateur peut envoyer un message si:
1. **Il est l'expéditeur** (`sender_id = auth.uid()`)
2. **ET** (il possède l'agence OU il est intéressé par le mandat OU c'est une conversation directe)

### Policy UPDATE (Marquer comme Lu)
Un utilisateur peut mettre à jour un message si:
1. **Il possède l'agence** (pour marquer les messages reçus comme lus)
2. **OU il est intéressé par le mandat** (pour marquer les messages reçus comme lus)
3. **OU c'est une conversation directe** et il n'est pas l'expéditeur

## ✅ Pourquoi Cette Solution Fonctionne

### Pas de Récursion Infinie
- ❌ **Avant**: La policy SELECT interrogeait la table `messages` dans sa propre condition
- ✅ **Maintenant**: Les policies interrogent uniquement les tables `agencies` et `mandate_interests`
- ✅ **Résultat**: Pas de récursion, pas d'erreur

### Compatible Web + Mobile
- ✅ L'interface web (agence) peut voir tous les messages de son agence
- ✅ L'app mobile (enquêteur) peut voir les messages des mandats qui l'intéressent
- ✅ Les conversations directes fonctionnent dans les deux sens

### Optimisé pour la Performance
- ✅ Index sur `agency_id`, `mandate_id`, `sender_id`
- ✅ Index sur les messages non lus
- ✅ Index pour trier par date
- ✅ Realtime activé pour les mises à jour instantanées

## 🚨 En Cas de Problème

### Erreur: "infinite recursion detected"
➡️ Le script n'a pas été exécuté correctement. Réexécutez `SOLUTION-FINALE-RLS-MESSAGES.sql`

### Les messages n'apparaissent pas
➡️ Vérifiez que:
1. L'utilisateur est bien authentifié (`auth.uid()` retourne un UUID)
2. Pour les agences: `owner_id` dans la table `agencies` correspond à `auth.uid()`
3. Pour les enquêteurs: Il existe une entrée dans `mandate_interests` avec `investigator_id = auth.uid()`

### Les messages ne s'envoient pas
➡️ Vérifiez que:
1. `sender_id` dans le message correspond à `auth.uid()`
2. `agency_id` est bien renseigné
3. Pour les messages de mandat: `mandate_id` existe et l'utilisateur a un intérêt dans ce mandat

## 📞 Support

Si vous avez encore des problèmes après avoir appliqué cette solution:
1. Vérifiez les logs dans la console du navigateur
2. Vérifiez les logs dans l'app mobile
3. Utilisez la page de diagnostic: `/agence/messages/diagnostic`
