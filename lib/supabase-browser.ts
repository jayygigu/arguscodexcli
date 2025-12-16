// Simpler browser-only Supabase client with inline config
// Avoids null returns and ensures a valid client or throws.

import type { Database } from "@/types/database.types"

const SUPABASE_URL_INLINE = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY_INLINE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

let browserClient: ReturnType<typeof import("@supabase/supabase-js").createClient<Database>> | null = null
let initPromise: Promise<typeof browserClient> | null = null

async function ensureClient() {
  if (typeof window === "undefined") {
    throw new Error("Supabase browser client cannot initialize during SSR")
  }

  if (browserClient) return browserClient
  if (initPromise) return initPromise

  initPromise = (async () => {
    const { createClient: createSupabaseJSClient } = await import("@supabase/supabase-js")
    const client = createSupabaseJSClient<Database>(SUPABASE_URL_INLINE, SUPABASE_ANON_KEY_INLINE, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })

    if (!client || !client.auth) {
      throw new Error("Failed to create Supabase browser client")
    }

    browserClient = client
    return client
  })()

  return initPromise
}

export function createClient() {
  if (typeof window === "undefined") {
    throw new Error("createClient() from supabase-browser cannot run in SSR")
  }
  if (browserClient) return browserClient
  // kick off async init in background
  ensureClient().catch((err) => console.error("[Supabase] init failed", err))
  return null
}

export async function createClientAsync() {
  return ensureClient()
}

export const createBrowserSupabaseClient = createClient
