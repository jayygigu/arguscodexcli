import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

// Inline Supabase configuration - ALWAYS available, no imports needed
// These values are hardcoded to ensure they're always available in production
const SUPABASE_URL_INLINE = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY_INLINE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

// Validate inline values at module load
if (!SUPABASE_URL_INLINE || typeof SUPABASE_URL_INLINE !== "string" || SUPABASE_URL_INLINE.trim() === "") {
  throw new Error("SUPABASE_URL_INLINE is invalid")
}
if (!SUPABASE_ANON_KEY_INLINE || typeof SUPABASE_ANON_KEY_INLINE !== "string" || SUPABASE_ANON_KEY_INLINE.trim() === "") {
  throw new Error("SUPABASE_ANON_KEY_INLINE is invalid")
}

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// Factory function that creates client with guaranteed values
function createSupabaseClient() {
  // Use inline values directly - no imports, no dependencies
  const url = SUPABASE_URL_INLINE.trim()
  const key = SUPABASE_ANON_KEY_INLINE.trim()

  // Final validation
  if (!url || !key) {
    throw new Error(`Supabase configuration invalid: url=${!!url}, key=${!!key}`)
  }

  try {
    return createBrowserClient<Database>(url, key)
  } catch (error: any) {
    throw new Error(`Failed to create Supabase client: ${error?.message || error}`)
  }
}

export function createClient() {
  // Always use inline values - never rely on imports
  const url = SUPABASE_URL_INLINE.trim()
  const key = SUPABASE_ANON_KEY_INLINE.trim()

  // Validate before creating
  if (!url || !key) {
    throw new Error(`Supabase configuration invalid: url=${!!url}, key=${!!key}`)
  }

  if (typeof window === "undefined") {
    // SSR: create fresh client each time
    return createSupabaseClient()
  }

  // Browser: use singleton
  if (!browserClient) {
    browserClient = createSupabaseClient()
  }

  return browserClient
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
