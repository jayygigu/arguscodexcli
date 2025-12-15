import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

const SUPABASE_URL = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Only create in browser environment
  if (typeof window === "undefined") {
    console.log("[v0] createClient called on server - returning null-safe client")
    // Return a minimal client for SSR that won't crash
    return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  if (!browserClient) {
    console.log("[v0] Creating new Supabase browser client")
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    console.log("[v0] Browser client created:", !!browserClient, "auth:", !!browserClient?.auth)
  } else {
    console.log("[v0] Reusing existing Supabase browser client")
  }

  return browserClient
}

export const createBrowserSupabaseClient = createClient
