import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

function createDummyClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error("Client not initialized") }),
      getSession: async () => ({ data: { session: null }, error: new Error("Client not initialized") }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: new Error("Client not initialized"),
      }),
      signUp: async () => ({ data: { user: null, session: null }, error: new Error("Client not initialized") }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: new Error("Client not initialized") }),
          single: async () => ({ data: null, error: new Error("Client not initialized") }),
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        order: () => ({ data: [], error: null }),
      }),
      insert: async () => ({ data: null, error: new Error("Client not initialized") }),
      update: () => ({
        eq: async () => ({ data: null, error: new Error("Client not initialized") }),
      }),
      delete: () => ({
        eq: async () => ({ data: null, error: new Error("Client not initialized") }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    }),
    removeChannel: () => {},
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error("Client not initialized") }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  } as any
}

function createNewClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Supabase credentials missing!")
    return createDummyClient()
  }

  try {
    return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    })
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error)
    return createDummyClient()
  }
}

// Singleton instance for browser
let supabaseInstance: ReturnType<typeof createNewClient> | null = null

export function createClient() {
  if (typeof window === "undefined") {
    return createNewClient()
  }

  if (!supabaseInstance) {
    supabaseInstance = createNewClient()
  }

  return supabaseInstance
}

export const createBrowserSupabaseClient = createClient
