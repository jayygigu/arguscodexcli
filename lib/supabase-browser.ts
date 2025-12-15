import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

const SUPABASE_URL = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

// Singleton instance
let browserClient: SupabaseClient<Database> | null = null

export function createClient(): SupabaseClient<Database> {
  // Return existing instance if available
  if (browserClient) {
    return browserClient
  }

  // Server-side: return a dummy client that won't crash
  if (typeof window === "undefined") {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "SSR" } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: null }), data: [], error: null }),
          single: async () => ({ data: null, error: null }),
          data: [],
          error: null,
        }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        delete: () => ({ eq: () => ({ data: null, error: null }) }),
      }),
      channel: () => ({ on: () => ({ subscribe: () => {} }), unsubscribe: () => {} }),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
    } as unknown as SupabaseClient<Database>
  }

  // Client-side: create real Supabase client
  browserClient = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}

export const createBrowserSupabaseClient = createClient
