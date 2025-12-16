// CRITICAL: This module should NEVER execute during SSR/build
// All imports and code execution are deferred until browser runtime

import type { Database } from "@/types/database.types"

// Inline Supabase configuration - ALWAYS available, no imports needed
// These values are hardcoded to ensure they're always available in production
const SUPABASE_URL_INLINE = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY_INLINE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

// CRITICAL: Do NOT validate or execute any code at module load time
// This prevents the module from throwing errors during prerendering
// All validation and execution happens only in browser runtime

let browserClient: any = null
let clientInitPromise: Promise<any> | null = null

// Initialize client asynchronously - this ensures @supabase/supabase-js is never loaded during SSR
async function initClient() {
  if (typeof window === "undefined") {
    throw new Error("Cannot initialize Supabase client during SSR")
  }

  if (browserClient) {
    return browserClient
  }

  if (clientInitPromise) {
    return clientInitPromise
  }

  clientInitPromise = (async () => {
    try {
      // Dynamic import - only loads in browser
      const { createClient: createSupabaseJSClient } = await import("@supabase/supabase-js")
      
      // CRITICAL: Use inline values directly - create fresh string copies
      const url = String(SUPABASE_URL_INLINE).trim()
      const key = String(SUPABASE_ANON_KEY_INLINE).trim()

      // CRITICAL: Validate values are actual non-empty strings
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
      const supabaseUrl: string = trimmedUrl
      const supabaseKey: string = trimmedKey

      // Final check - ensure they're still strings and not null/undefined
      if (typeof supabaseUrl !== "string" || typeof supabaseKey !== "string") {
        throw new Error(`Type mismatch: url=${typeof supabaseUrl}, key=${typeof supabaseKey}`)
      }

      if (supabaseUrl === undefined || supabaseUrl === null || supabaseKey === undefined || supabaseKey === null) {
        throw new Error(`Values are null/undefined: url=${supabaseUrl}, key=${supabaseKey}`)
      }

      // Create client with validated values
      const client = createSupabaseJSClient<Database>(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
      
      // Validate client was created
      if (!client || typeof client !== "object") {
        throw new Error(`createClient returned invalid: ${typeof client}`)
      }
      
      if (!client.auth || typeof client.auth !== "object") {
        throw new Error(`createClient returned client without valid auth: ${typeof client.auth}`)
      }
      
      if (typeof client.auth.getUser !== "function") {
        throw new Error("createClient returned client with invalid auth.getUser")
      }
      
      browserClient = client
      return client
    } catch (error: any) {
      clientInitPromise = null // Reset on failure
      const errorMsg = error?.message || String(error) || "Unknown error"
      console.error("[Supabase] Client initialization failed:", {
        error: errorMsg,
        urlType: typeof SUPABASE_URL_INLINE,
        keyType: typeof SUPABASE_ANON_KEY_INLINE,
      })
      throw new Error(`Failed to initialize Supabase client: ${errorMsg}`)
    }
  })()

  return clientInitPromise
}

// Synchronous API for backward compatibility
// This will return null initially and the client will be available after init
export function createClient() {
  // CRITICAL: Never create browser client during SSR/build
  if (typeof window === "undefined") {
    throw new Error("createClient() from supabase-browser.ts cannot be used in SSR. Use createClient() from supabase-server.ts instead.")
  }

  // If client is already initialized, return it
  if (browserClient) {
    return browserClient
  }

  // If initialization is in progress, we can't return synchronously
  // This is a limitation - callers should use useSupabaseClient() hook instead
  // But for backward compatibility, we'll start initialization and return null
  // The hook will handle the async initialization properly
  if (!clientInitPromise) {
    initClient().catch((err) => {
      console.error("[Supabase] Failed to initialize client:", err)
    })
  }

  // Return null if not yet initialized - this forces callers to handle async initialization
  // But this breaks backward compatibility...
  // Instead, let's throw an error to force migration to useSupabaseClient()
  throw new Error("Supabase client not yet initialized. Use useSupabaseClient() hook or await initClient() instead.")
}

// Async version for proper initialization
export async function createClientAsync() {
  if (typeof window === "undefined") {
    throw new Error("createClientAsync() from supabase-browser.ts cannot be used in SSR.")
  }
  return initClient()
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
