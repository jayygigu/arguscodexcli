# Documentation du Système de Messagerie Argus

## Vue d'ensemble

Le système de messagerie Argus permet la communication en temps réel entre les agences (interface web) et les enquêteurs (application mobile). Ce document explique comment les messages fonctionnent et comment résoudre les problèmes de réception.

---

## Architecture du Système

### 1. Structure de la Base de Données

#### Table `messages`
\`\`\`sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id UUID NULL,              -- NULL pour conversations directes
  agency_id UUID NOT NULL,           -- ID de l'agence (toujours requis)
  sender_id UUID NOT NULL,           -- ID de l'utilisateur qui envoie
  sender_name TEXT NOT NULL,         -- Nom de l'expéditeur
  sender_type TEXT NOT NULL,         -- 'agency' ou 'investigator'
  content TEXT NOT NULL,             -- Contenu du message
  read BOOLEAN DEFAULT false,        -- Message lu ou non
  delivered BOOLEAN DEFAULT true,    -- Message livré ou non
  read_at TIMESTAMP NULL,            -- Quand le message a été lu
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

**Points clés:**
- `agency_id` est TOUJOURS requis (même pour conversations directes)
- `mandate_id` est NULL pour les conversations directes
- `sender_type` indique si c'est l'agence ou l'enquêteur qui envoie

---

## 2. Flux de Messages

### De l'Agence vers l'Enquêteur

\`\`\`
┌─────────────────┐
│  Interface Web  │
│    (Agence)     │
└────────┬────────┘
         │
         │ 1. sendMessage()
         ▼
┌─────────────────┐
│   Supabase DB   │
│  Table messages │
└────────┬────────┘
         │
         │ 2. Realtime INSERT event
         ▼
┌─────────────────┐
│   App Mobile    │
│  (Enquêteur)    │
└─────────────────┘
\`\`\`

**Étape 1: Envoi du message (Web)**
\`\`\`typescript
await supabase.from("messages").insert({
  mandate_id: null,              // NULL pour conversation directe
  agency_id: "uuid-agence",      // ID de l'agence
  sender_id: "uuid-user-agence", // ID du propriétaire de l'agence
  sender_name: "Nom Agence",
  sender_type: "agency",         // Important!
  content: "Bonjour!",
  delivered: true,
  read: false
})
\`\`\`

**Étape 2: Réception (Mobile)**
L'app mobile doit s'abonner aux changements:
\`\`\`typescript
supabase
  .channel('messages-channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `agency_id=eq.${agencyId}` // Filtrer par agence
  }, (payload) => {
    const newMessage = payload.new
    // Ajouter le message à l'interface
  })
  .subscribe()
\`\`\`

---

## 3. Politiques RLS (Row Level Security)

### Problème Courant: Messages Non Reçus

**Cause #1 (90% des cas):** Les politiques RLS bloquent l'accès

#### Solution: Appliquer les bonnes politiques

Exécutez le script SQL suivant dans Supabase:

\`\`\`sql
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view messages they are part of" ON messages;

-- Créer la nouvelle politique SELECT
CREATE POLICY "Users can view conversation messages" ON messages
FOR SELECT USING (
  -- Je peux voir mes propres messages
  sender_id = auth.uid()
  OR
  -- Je peux voir les messages des agences avec qui je communique
  (
    sender_type = 'agency' 
    AND agency_id IN (
      SELECT DISTINCT agency_id 
      FROM messages 
      WHERE sender_id = auth.uid()
    )
  )
  OR
  -- Les agences peuvent voir tous leurs messages
  EXISTS (
    SELECT 1 FROM agencies 
    WHERE agencies.id = messages.agency_id 
    AND agencies.owner_id = auth.uid()
  )
);
\`\`\`

**Vérification:**
\`\`\`sql
-- Tester si l'enquêteur peut voir les messages de l'agence
SELECT * FROM messages 
WHERE agency_id = 'uuid-agence' 
AND sender_type = 'agency';
\`\`\`

---

## 4. Configuration Realtime

### Activer Realtime sur la table messages

\`\`\`sql
-- Vérifier que Realtime est activé
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
\`\`\`

### Vérifier dans Supabase Dashboard

1. Aller dans **Database** → **Replication**
2. Vérifier que `messages` est dans la liste des tables répliquées
3. Si non, cliquer sur **Add table** et sélectionner `messages`

---

## 5. Implémentation Mobile (React Native)

### Hook useMessages pour l'App Mobile

\`\`\`typescript
export function useMessages(agencyId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const supabase = useSupabaseClient()

  // 1. Charger les messages existants
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('agency_id', agencyId)
        .is('mandate_id', null) // Conversations directes
        .order('created_at', { ascending: true })
      
      if (data) setMessages(data)
    }
    loadMessages()
  }, [agencyId])

  // 2. S'abonner aux nouveaux messages
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${agencyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `agency_id=eq.${agencyId}`
      }, (payload) => {
        const newMessage = payload.new as Message
        
        // Vérifier que c'est une conversation directe
        if (newMessage.mandate_id === null) {
          setMessages(prev => [...prev, newMessage])
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `agency_id=eq.${agencyId}`
      }, (payload) => {
        const updated = payload.new as Message
        setMessages(prev => 
          prev.map(m => m.id === updated.id ? updated : m)
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [agencyId])

  // 3. Envoyer un message
  const sendMessage = async (content: string, userId: string, userName: string) => {
    await supabase.from('messages').insert({
      mandate_id: null,
      agency_id: agencyId,
      sender_id: userId,
      sender_name: userName,
      sender_type: 'investigator',
      content,
      delivered: true,
      read: false
    })
  }

  return { messages, sendMessage }
}
\`\`\`

---

## 6. Diagnostic et Dépannage

### Checklist de Vérification

#### ✅ Étape 1: Vérifier l'insertion du message
\`\`\`sql
-- Dans Supabase SQL Editor
SELECT * FROM messages 
WHERE agency_id = 'votre-agency-id'
ORDER BY created_at DESC 
LIMIT 10;
\`\`\`

**Attendu:** Vous devriez voir les messages de l'agence avec `sender_type = 'agency'`

#### ✅ Étape 2: Vérifier les politiques RLS
\`\`\`sql
-- Tester en tant qu'enquêteur
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'investigator-user-id';

SELECT * FROM messages 
WHERE agency_id = 'agency-id' 
AND sender_type = 'agency';
\`\`\`

**Attendu:** Les messages doivent être visibles

#### ✅ Étape 3: Vérifier Realtime
Dans votre app mobile, ajoutez des logs:
\`\`\`typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'messages',
  filter: `agency_id=eq.${agencyId}`
}, (payload) => {
  console.log('📨 Nouveau message reçu:', payload.new)
  // Si vous ne voyez pas ce log, Realtime ne fonctionne pas
})
\`\`\`

#### ✅ Étape 4: Vérifier la connexion Realtime
\`\`\`typescript
.subscribe((status) => {
  console.log('🔌 Statut Realtime:', status)
  // Doit afficher "SUBSCRIBED"
})
\`\`\`

---

## 7. Problèmes Courants et Solutions

### Problème 1: Messages non reçus sur mobile

**Symptômes:**
- Messages visibles dans Supabase DB
- Messages visibles sur l'interface web
- Pas de messages sur l'app mobile

**Solutions:**
1. Vérifier les politiques RLS (voir section 3)
2. Vérifier que Realtime est activé (voir section 4)
3. Vérifier le filtre de subscription (`agency_id=eq.${agencyId}`)
4. Vérifier que `mandate_id` est NULL pour conversations directes

### Problème 2: Messages en double

**Cause:** Subscription reçoit le message ET la query le charge

**Solution:** Déduplication dans le hook
\`\`\`typescript
const newMessage = payload.new as Message
setMessages(prev => {
  // Éviter les doublons
  if (prev.some(m => m.id === newMessage.id)) {
    return prev
  }
  return [...prev, newMessage]
})
\`\`\`

### Problème 3: Filtre Realtime ne fonctionne pas

**Cause:** Supabase Realtime ne supporte qu'un filtre `=eq.` à la fois

**Solution:** Filtrer côté client
\`\`\`typescript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'messages',
  filter: `agency_id=eq.${agencyId}` // Filtre large
}, (payload) => {
  const msg = payload.new as Message
  
  // Filtrer côté client pour conversations directes
  if (msg.mandate_id === null) {
    setMessages(prev => [...prev, msg])
  }
})
\`\`\`

---

## 8. Tests de Validation

### Test 1: Envoi Agence → Enquêteur

1. Sur l'interface web, envoyer un message
2. Vérifier dans Supabase que le message est inséré
3. Vérifier sur l'app mobile que le message apparaît

### Test 2: Envoi Enquêteur → Agence

1. Sur l'app mobile, envoyer un message
2. Vérifier dans Supabase que le message est inséré
3. Vérifier sur l'interface web que le message apparaît

### Test 3: Marquer comme lu

1. Recevoir un message
2. L'ouvrir dans l'interface
3. Vérifier que `read = true` et `read_at` est défini

---

## 9. Logs de Débogage

### Sur l'Interface Web

Les logs suivants apparaissent dans la console:
\`\`\`
[v0] Fetching messages for agency: xxx mandate: null
[v0] Setting up real-time subscription: messages-direct-xxx
[v0] Subscription status: SUBSCRIBED
[v0] Loaded messages: 15
[v0] New message received via Realtime: {...}
[v0] Message matches conversation, adding to cache
\`\`\`

### Sur l'App Mobile

Ajoutez ces logs pour déboguer:
\`\`\`typescript
console.log('📱 Initializing messages for agency:', agencyId)
console.log('📱 Subscription status:', status)
console.log('📨 New message received:', payload.new)
console.log('✅ Message added to state')
\`\`\`

---

## 10. Résumé des Points Clés

1. **`agency_id` est TOUJOURS requis** - Même pour conversations directes
2. **`mandate_id = null`** - Pour les conversations directes (pas de mandat)
3. **Politiques RLS** - Doivent permettre aux enquêteurs de voir les messages des agences
4. **Realtime activé** - La table `messages` doit être dans la réplication
5. **Filtre client-side** - Filtrer par `mandate_id` côté client, pas dans Realtime
6. **Déduplication** - Vérifier les doublons avant d'ajouter au state

---

## Support

Si les messages ne fonctionnent toujours pas après avoir suivi ce guide:

1. Exécuter le script SQL de diagnostic: `/agence/messages/diagnostic`
2. Vérifier les logs dans la console (web et mobile)
3. Vérifier les politiques RLS dans Supabase Dashboard
4. Vérifier que Realtime est activé pour la table `messages`

---

**Dernière mise à jour:** 2025-01-28
