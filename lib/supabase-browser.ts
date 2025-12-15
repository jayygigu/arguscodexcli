import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

const SUPABASE_URL = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (browserClient && browserClient.auth) {
    return browserClient
  }

  try {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

    if (!browserClient || !browserClient.auth) {
      throw new Error("Supabase client creation failed")
    }

    return browserClient
  } catch (error) {
    console.error("[Supabase] Failed to create browser client:", error)
    browserClient = null
    const freshClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    if (freshClient && freshClient.auth) {
      browserClient = freshClient
      return browserClient
    }
    throw new Error("Unable to initialize Supabase client")
  }
}

export const createBrowserSupabaseClient = createClient
