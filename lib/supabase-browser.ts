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

  // Validate before creating - throw early if invalid
  if (!url || url.length === 0) {
    const error = new Error(`Supabase URL is invalid: ${typeof url}`)
    console.error("Supabase configuration error:", error)
    throw error
  }

  if (!key || key.length === 0) {
    const error = new Error(`Supabase ANON_KEY is invalid: ${typeof key}`)
    console.error("Supabase configuration error:", error)
    throw error
  }

  // Additional validation - ensure they're actual strings
  if (typeof url !== "string" || typeof key !== "string") {
    const error = new Error(`Supabase config type error: url=${typeof url}, key=${typeof key}`)
    console.error("Supabase configuration error:", error)
    throw error
  }

  if (typeof window === "undefined") {
    // SSR: create fresh client each time
    const client = createSupabaseClient()
    // Validate client was created successfully
    if (!client || !client.auth) {
      throw new Error("Failed to create SSR Supabase client - client is invalid")
    }
    return client
  }

  // Browser: use singleton
  if (!browserClient) {
    browserClient = createSupabaseClient()
    // Validate client was created successfully
    if (!browserClient || !browserClient.auth) {
      browserClient = null // Reset on failure
      throw new Error("Failed to create browser Supabase client - client is invalid")
    }
  }

  return browserClient
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
