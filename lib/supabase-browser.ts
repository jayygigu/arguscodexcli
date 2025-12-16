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
  // CRITICAL: Use inline values directly - create fresh string copies
  const url = String(SUPABASE_URL_INLINE).trim()
  const key = String(SUPABASE_ANON_KEY_INLINE).trim()

  // CRITICAL: Validate values are actual non-empty strings before calling createBrowserClient
  if (typeof url !== "string" || url.length === 0) {
    throw new Error(`Supabase URL is invalid: type=${typeof url}, length=${url?.length || 0}`)
  }

  if (typeof key !== "string" || key.length === 0) {
    throw new Error(`Supabase ANON_KEY is invalid: type=${typeof key}, length=${key?.length || 0}`)
  }

  // Additional validation
  const trimmedUrl = url.trim()
  const trimmedKey = key.trim()
  
  if (trimmedUrl.length === 0 || trimmedKey.length === 0) {
    throw new Error(`Supabase configuration contains only whitespace`)
  }

  if (!trimmedUrl.startsWith("https://") || !trimmedUrl.includes(".supabase.co")) {
    throw new Error(`Supabase URL format invalid`)
  }

  if (trimmedKey.length < 100) {
    throw new Error(`Supabase ANON_KEY length invalid: ${trimmedKey.length}`)
  }

  // CRITICAL: Store values in variables that cannot be optimized away
  // Pass them as separate arguments to ensure they're not undefined
  const supabaseUrl: string = trimmedUrl
  const supabaseKey: string = trimmedKey

  // Final check - ensure they're still strings
  if (typeof supabaseUrl !== "string" || typeof supabaseKey !== "string") {
    throw new Error(`Type mismatch: url=${typeof supabaseUrl}, key=${typeof supabaseKey}`)
  }

  // CRITICAL: Verify values are not undefined or null
  if (supabaseUrl === undefined || supabaseUrl === null || supabaseKey === undefined || supabaseKey === null) {
    throw new Error(`Values are null/undefined: url=${supabaseUrl}, key=${supabaseKey}`)
  }

  try {
    // Create client with validated values - pass as separate arguments
    // This ensures the bundler doesn't modify the arguments
    const client = createBrowserClient<Database>(supabaseUrl, supabaseKey)
    
    // Validate client was created
    if (!client || typeof client !== "object") {
      throw new Error(`createBrowserClient returned invalid: ${typeof client}`)
    }
    
    if (!client.auth || typeof client.auth !== "object") {
      throw new Error(`createBrowserClient returned client without valid auth: ${typeof client.auth}`)
    }
    
    if (typeof client.auth.getUser !== "function") {
      throw new Error("createBrowserClient returned client with invalid auth.getUser")
    }
    
    return client
  } catch (error: any) {
    const errorMsg = error?.message || String(error) || "Unknown error"
    console.error("[Supabase] Client creation failed:", {
      error: errorMsg,
      urlLength: supabaseUrl.length,
      keyLength: supabaseKey.length,
      urlType: typeof supabaseUrl,
      keyType: typeof supabaseKey,
      urlValue: supabaseUrl.substring(0, 30),
    })
    throw new Error(`Failed to create Supabase client: ${errorMsg}`)
  }
}

export function createClient() {
  // CRITICAL: Never create browser client during SSR/build
  if (typeof window === "undefined") {
    throw new Error("createClient() from supabase-browser.ts cannot be used in SSR. Use createClient() from supabase-server.ts instead.")
  }

  // Browser: use singleton
  if (!browserClient) {
    try {
      browserClient = createSupabaseClient()
      
      if (!browserClient || !browserClient.auth) {
        browserClient = null
        throw new Error("browserClient is invalid after creation")
      }
    } catch (error: any) {
      browserClient = null
      const errorMsg = error?.message || String(error) || "Unknown error"
      console.error("[Supabase] Failed to create browser client:", errorMsg)
      throw new Error(`Failed to create browser Supabase client: ${errorMsg}`)
    }
  }

  return browserClient
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
