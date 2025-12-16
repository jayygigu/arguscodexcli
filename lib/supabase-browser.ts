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
  // CRITICAL: Use inline values directly - create fresh copies to avoid any bundling issues
  // Don't use any intermediate variables that could be optimized away
  const url: string = SUPABASE_URL_INLINE.trim()
  const key: string = SUPABASE_ANON_KEY_INLINE.trim()

  // CRITICAL: Validate values are actual non-empty strings before calling createBrowserClient
  if (typeof url !== "string" || url.length === 0) {
    const error = new Error(`Supabase URL is invalid: type=${typeof url}, length=${url?.length || 0}`)
    console.error("[Supabase] Configuration error:", error)
    throw error
  }

  if (typeof key !== "string" || key.length === 0) {
    const error = new Error(`Supabase ANON_KEY is invalid: type=${typeof key}, length=${key?.length || 0}`)
    console.error("[Supabase] Configuration error:", error)
    throw error
  }

  // Additional validation - ensure they're not just whitespace
  const trimmedUrl = url.trim()
  const trimmedKey = key.trim()
  
  if (trimmedUrl.length === 0 || trimmedKey.length === 0) {
    throw new Error(`Supabase configuration contains only whitespace`)
  }

  // Final validation - ensure values match expected format
  if (!trimmedUrl.startsWith("https://") || !trimmedUrl.includes(".supabase.co")) {
    throw new Error(`Supabase URL format invalid`)
  }

  if (trimmedKey.length < 100) {
    throw new Error(`Supabase ANON_KEY length invalid: ${trimmedKey.length}`)
  }

  // CRITICAL: Pass values directly to createBrowserClient - no intermediate processing
  // This ensures the bundler doesn't modify or optimize away the values
  try {
    // Create client with validated values - pass them directly as arguments
    const client = createBrowserClient<Database>(trimmedUrl, trimmedKey)
    
    // Validate client was created and has required properties
    if (!client) {
      throw new Error("createBrowserClient returned null/undefined")
    }
    
    if (!client || typeof client !== "object") {
      throw new Error(`createBrowserClient returned invalid type: ${typeof client}`)
    }
    
    if (!client.auth) {
      throw new Error("createBrowserClient returned client without auth property")
    }
    
    if (typeof client.auth !== "object") {
      throw new Error(`createBrowserClient returned client with invalid auth type: ${typeof client.auth}`)
    }
    
    // Additional validation - ensure auth has required methods
    if (typeof client.auth.getUser !== "function") {
      throw new Error("createBrowserClient returned client with invalid auth.getUser")
    }
    
    return client
  } catch (error: any) {
    // Enhanced error message with context
    const errorMsg = error?.message || String(error) || "Unknown error"
    const fullError = new Error(
      `Failed to create Supabase client: ${errorMsg}. URL: ${trimmedUrl.substring(0, 30)}..., Key length: ${trimmedKey.length}`
    )
    console.error("[Supabase] Client creation failed:", fullError, { url: trimmedUrl.substring(0, 30), keyLength: trimmedKey.length })
    throw fullError
  }
}

export function createClient() {
  // CRITICAL: Never create browser client during SSR/build
  // createBrowserClient is ONLY for browser environment
  if (typeof window === "undefined") {
    throw new Error("createClient() from supabase-browser.ts cannot be used in SSR. Use createClient() from supabase-server.ts instead.")
  }

  // Browser: use singleton
  if (!browserClient) {
    try {
      browserClient = createSupabaseClient()
      
      // Final validation after creation
      if (!browserClient) {
        browserClient = null
        throw new Error("browserClient is null after creation")
      }
      
      if (!browserClient.auth) {
        browserClient = null
        throw new Error("browserClient.auth is undefined after creation")
      }
    } catch (error: any) {
      browserClient = null // Reset on failure
      const errorMsg = error?.message || String(error) || "Unknown error"
      console.error("[Supabase] Failed to create browser Supabase client:", errorMsg, error)
      throw new Error(`Failed to create browser Supabase client: ${errorMsg}`)
    }
  }

  return browserClient
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
