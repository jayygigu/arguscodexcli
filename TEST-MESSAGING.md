# Guide de Test: Système de Messagerie Argus

## Vue d'Ensemble

Ce guide vous permet de tester complètement le système de messagerie bidirectionnel entre l'interface web de l'agence et l'application mobile de l'enquêteur.

## Prérequis

### Configuration Requise

1. **Base de données Supabase:**
   - Table `messages` créée
   - Table `typing_indicators` créée
   - RLS policies correctement configurées
   - Realtime activé sur les tables

2. **Interface Web (Agence):**
   - Utilisateur agence connecté
   - Accès à `/agence/messages`

3. **Application Mobile (Enquêteur):**
   - Utilisateur enquêteur connecté
   - Console de déboggage ouverte

### Scripts SQL à Exécuter

\`\`\`sql
-- 1. Vérifier que les tables existent
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('messages', 'typing_indicators');

-- 2. Vérifier les RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('messages', 'typing_indicators');

-- 3. Vérifier Realtime
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
\`\`\`

## Tests Fonctionnels

### Test 1: Message Agence → Enquêteur

**Objectif:** Vérifier que les messages envoyés depuis l'interface web arrivent sur l'app mobile.

#### Étapes

1. **Ouvrir l'app mobile avec la console:**
   \`\`\`bash
   # React Native
   npx react-native log-android  # ou log-ios
   \`\`\`

2. **Depuis l'interface web:**
   - Aller sur `/agence/messages`
   - Cliquer sur une conversation avec un enquêteur
   - Envoyer un message: "Test message agence"

3. **Vérifier les logs de l'app mobile:**
   \`\`\`
   ✅ Logs attendus:
   [Messages] 📨 New message received: {...}
   [Messages] 🔍 Checking filters for message
   [Messages] ✅ Message passed direct conversation filters
   [Messages] ➕ Added new message to state
   [MessagesScreen] 📱 Displaying X messages
   [MessagesScreen] 📱 Agency messages: Y
   \`\`\`

4. **Vérifier l'affichage:**
   - Le message doit apparaître immédiatement dans l'app
   - Le message doit être aligné à gauche (message de l'agence)
   - L'avatar de l'agence doit être affiché

#### Résultat Attendu

- ✅ Message reçu en < 1 seconde
- ✅ Message affiché correctement
- ✅ Pas d'erreur dans les logs
- ✅ Badge de notification mis à jour

### Test 2: Message Enquêteur → Agence

**Objectif:** Vérifier que les messages envoyés depuis l'app mobile arrivent sur l'interface web.

#### Étapes

1. **Ouvrir l'interface web avec la console:**
   - F12 pour ouvrir DevTools
   - Onglet Console

2. **Depuis l'app mobile:**
   - Ouvrir une conversation avec l'agence
   - Envoyer un message: "Test message enquêteur"

3. **Vérifier les logs de l'interface web:**
   \`\`\`
   ✅ Logs attendus:
   [Messages] 📨 New message received via Realtime
   [Messages] ✅ Message passed filters
   [Messages] ➕ Adding message to cache
   \`\`\`

4. **Vérifier l'affichage:**
   - Le message doit apparaître immédiatement
   - Le message doit être aligné à droite (message de l'enquêteur)
   - L'avatar de l'enquêteur doit être affiché

#### Résultat Attendu

- ✅ Message reçu en < 1 seconde
- ✅ Message affiché correctement
- ✅ Pas d'erreur dans les logs
- ✅ Compteur de messages mis à jour

### Test 3: Indicateurs de Frappe

**Objectif:** Vérifier que les indicateurs "en train d'écrire" fonctionnent dans les deux directions.

#### Test 3A: Agence écrit

1. **Depuis l'interface web:**
   - Commencer à taper dans le champ de message
   - NE PAS envoyer le message

2. **Vérifier l'app mobile:**
   - L'indicateur "Agence est en train d'écrire..." doit apparaître
   - L'indicateur doit disparaître après 3 secondes d'inactivité

#### Test 3B: Enquêteur écrit

1. **Depuis l'app mobile:**
   - Commencer à taper dans le champ de message
   - NE PAS envoyer le message

2. **Vérifier l'interface web:**
   - L'indicateur "[Nom] est en train d'écrire..." doit apparaître
   - L'indicateur doit disparaître après 3 secondes d'inactivité

#### Résultat Attendu

- ✅ Indicateur apparaît en < 500ms
- ✅ Indicateur disparaît après inactivité
- ✅ Pas de spam d'indicateurs

### Test 4: Statut de Lecture

**Objectif:** Vérifier que les messages sont marqués comme lus correctement.

#### Étapes

1. **Envoyer un message depuis l'agence**

2. **Vérifier l'interface web:**
   - Le message doit avoir une coche simple (✓) = envoyé
   - Après réception, deux coches (✓✓) = livré

3. **Ouvrir la conversation sur l'app mobile:**
   - Le message doit être marqué comme lu automatiquement

4. **Vérifier l'interface web:**
   - Les coches doivent devenir vertes (✓✓) = lu

#### Résultat Attendu

- ✅ Statut "envoyé" immédiat
- ✅ Statut "livré" en < 1 seconde
- ✅ Statut "lu" quand l'app est ouverte
- ✅ Couleur des coches change correctement

### Test 5: Statut En Ligne/Hors Ligne

**Objectif:** Vérifier que le statut de présence fonctionne.

#### Étapes

1. **App mobile ouverte:**
   - Vérifier l'interface web
   - Le statut de l'enquêteur doit être "En ligne" (point vert)

2. **Fermer l'app mobile:**
   - Attendre 1 minute
   - Vérifier l'interface web
   - Le statut doit passer à "Hors ligne" (point gris)

3. **Rouvrir l'app mobile:**
   - Le statut doit redevenir "En ligne" immédiatement

#### Résultat Attendu

- ✅ Statut "En ligne" quand l'app est active
- ✅ Statut "Hors ligne" après fermeture
- ✅ Mise à jour automatique du statut
- ✅ Affichage de "Vu il y a X minutes"

## Tests de Performance

### Test 6: Latence des Messages

**Objectif:** Mesurer le temps de livraison des messages.

#### Méthode

1. Envoyer 10 messages consécutifs
2. Noter l'heure d'envoi et de réception pour chaque message
3. Calculer la latence moyenne

#### Résultat Attendu

- ✅ Latence moyenne < 500ms
- ✅ Latence maximale < 2 secondes
- ✅ Pas de messages perdus

### Test 7: Messages Multiples

**Objectif:** Vérifier que plusieurs messages sont gérés correctement.

#### Étapes

1. Envoyer 5 messages rapidement depuis l'agence
2. Vérifier que tous arrivent sur l'app mobile
3. Vérifier l'ordre des messages
4. Vérifier qu'il n'y a pas de doublons

#### Résultat Attendu

- ✅ Tous les messages arrivent
- ✅ Ordre correct (chronologique)
- ✅ Pas de doublons
- ✅ Pas de messages manquants

### Test 8: Reconnexion

**Objectif:** Vérifier que le système se reconnecte après une perte de connexion.

#### Étapes

1. **Couper la connexion internet:**
   - Mode avion sur mobile
   - Ou désactiver WiFi

2. **Envoyer un message depuis l'agence:**
   - Le message est envoyé mais pas reçu

3. **Rétablir la connexion:**
   - Désactiver le mode avion
   - Attendre la reconnexion

4. **Vérifier:**
   - Les messages manquants doivent être récupérés
   - La conversation doit être à jour

#### Résultat Attendu

- ✅ Reconnexion automatique
- ✅ Messages manquants récupérés
- ✅ Pas de perte de données
- ✅ Indicateur de connexion correct

## Tests de Régression

### Test 9: Conversations Multiples

**Objectif:** Vérifier que les messages n'apparaissent que dans la bonne conversation.

#### Étapes

1. Ouvrir une conversation avec l'enquêteur A
2. Envoyer un message
3. Ouvrir une conversation avec l'enquêteur B
4. Vérifier que le message de A n'apparaît pas dans B

#### Résultat Attendu

- ✅ Messages isolés par conversation
- ✅ Pas de fuite entre conversations
- ✅ Compteurs corrects pour chaque conversation

### Test 10: Messages avec Mandats

**Objectif:** Vérifier que les messages liés à un mandat fonctionnent.

#### Étapes

1. Créer un mandat et l'assigner à un enquêteur
2. Ouvrir la conversation du mandat
3. Envoyer des messages
4. Vérifier que les messages sont liés au mandat

#### Résultat Attendu

- ✅ Messages liés au bon mandat
- ✅ Séparation entre messages directs et messages de mandat
- ✅ Filtrage correct par mandate_id

## Diagnostic en Cas d'Échec

### Messages Non Reçus

**Checklist de diagnostic:**

1. **Vérifier les RLS policies:**
   \`\`\`sql
   -- Exécuter dans Supabase SQL Editor
   SELECT * FROM messages WHERE agency_id = 'YOUR_AGENCY_ID';
   \`\`\`
   - Si vous ne voyez pas les messages, les RLS policies bloquent l'accès

2. **Vérifier Realtime:**
   \`\`\`javascript
   // Dans la console de l'app
   console.log(supabase.getChannels());
   \`\`\`
   - Vérifier que le canal est connecté

3. **Vérifier les logs:**
   - Chercher `[Messages] ❌ Filtered out`
   - Vérifier les conditions de filtrage

4. **Vérifier la base de données:**
   \`\`\`sql
   SELECT * FROM messages 
   WHERE agency_id = 'YOUR_AGENCY_ID' 
   ORDER BY created_at DESC 
   LIMIT 10;
   \`\`\`

### Indicateurs de Frappe Non Fonctionnels

1. **Vérifier la table typing_indicators:**
   \`\`\`sql
   SELECT * FROM typing_indicators 
   WHERE agency_id = 'YOUR_AGENCY_ID';
   \`\`\`

2. **Vérifier les logs:**
   - Chercher `[Typing] Sending typing indicator`
   - Vérifier les erreurs d'insertion

### Statut En Ligne Incorrect

1. **Vérifier la table profiles:**
   \`\`\`sql
   SELECT id, is_online, last_seen_at, status_updated_at 
   FROM profiles 
   WHERE id = 'USER_ID';
   \`\`\`

2. **Vérifier le heartbeat:**
   - Chercher `[Presence] Heartbeat sent` dans les logs
   - Vérifier que le heartbeat s'exécute toutes les 30 secondes

## Outils de Diagnostic

### Page de Diagnostic Web

Accéder à `/agence/messages/diagnostic` pour:
- Vérifier l'authentification
- Tester les RLS policies
- Vérifier la connexion Realtime
- Voir les messages récents

### Logs de Déboggage

**Activer les logs détaillés:**

\`\`\`javascript
// Dans l'app mobile
localStorage.setItem('debug', 'messages:*');

// Dans l'interface web
localStorage.setItem('debug', 'messages:*');
\`\`\`

## Conclusion

Ce guide couvre tous les aspects du système de messagerie. Si tous les tests passent, le système fonctionne correctement. En cas d'échec, suivez les étapes de diagnostic pour identifier et résoudre le problème.

Pour plus d'informations, consultez:
- `DOCUMENTATION_MESSAGERIE.md` - Documentation complète
- `SOLUTION-MESSAGING-FIX.md` - Solution détaillée du problème de réception
