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
let initPromise: Promise<any> | null = null

// Initialize client - this function is safe to call multiple times
async function ensureClient() {
  if (typeof window === "undefined") {
    throw new Error("Cannot initialize Supabase client during SSR")
  }

  if (browserClient) {
    return browserClient
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    try {
      // Dynamic import - only loads in browser
      const { createClient: createSupabaseJSClient } = await import("@supabase/supabase-js")
      
      // Use inline values directly
      const url = String(SUPABASE_URL_INLINE).trim()
      const key = String(SUPABASE_ANON_KEY_INLINE).trim()

      // Validate values
      if (typeof url !== "string" || url.length === 0 || typeof key !== "string" || key.length === 0) {
        throw new Error("Invalid Supabase configuration")
      }

      const trimmedUrl = url.trim()
      const trimmedKey = key.trim()
      
      if (trimmedUrl.length === 0 || trimmedKey.length === 0) {
        throw new Error("Supabase configuration contains only whitespace")
      }

      if (!trimmedUrl.startsWith("https://") || !trimmedUrl.includes(".supabase.co")) {
        throw new Error("Supabase URL format invalid")
      }

      if (trimmedKey.length < 100) {
        throw new Error("Supabase ANON_KEY length invalid")
      }

      // Create client
      const client = createSupabaseJSClient<Database>(trimmedUrl, trimmedKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
      
      // Validate client
      if (!client || !client.auth) {
        throw new Error("browserClient is invalid after creation")
      }
      
      browserClient = client
      return client
    } catch (error: any) {
      initPromise = null // Reset on failure
      const errorMsg = error?.message || String(error) || "Unknown error"
      console.error("[Supabase] Client initialization failed:", errorMsg)
      throw new Error(`Failed to initialize Supabase client: ${errorMsg}`)
    }
  })()

  return initPromise
}

// Synchronous API - tries to return existing client or starts async init
export function createClient() {
  // CRITICAL: Never create browser client during SSR/build
  if (typeof window === "undefined") {
    throw new Error("createClient() from supabase-browser.ts cannot be used in SSR. Use createClient() from supabase-server.ts instead.")
  }

  // If client is already initialized, return it synchronously
  if (browserClient) {
    return browserClient
  }

  // Start initialization in background (non-blocking)
  ensureClient().catch((err) => {
    console.error("[Supabase] Background initialization failed:", err)
  })

  // For synchronous API, we can't wait - return a proxy that will work once initialized
  // Or throw error to force async usage
  // Actually, let's try to create it synchronously using require if possible
  try {
    // Use require for synchronous loading (only works if module is already loaded)
    const supabaseJS = require("@supabase/supabase-js")
    if (supabaseJS && supabaseJS.createClient) {
      const url = String(SUPABASE_URL_INLINE).trim()
      const key = String(SUPABASE_ANON_KEY_INLINE).trim()

      if (typeof url === "string" && url.length > 0 && typeof key === "string" && key.length > 0) {
        const trimmedUrl = url.trim()
        const trimmedKey = key.trim()
        
        if (trimmedUrl.startsWith("https://") && trimmedUrl.includes(".supabase.co") && trimmedKey.length >= 100) {
          browserClient = supabaseJS.createClient<Database>(trimmedUrl, trimmedKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          })
          
          if (browserClient && browserClient.auth) {
            return browserClient
          }
        }
      }
    }
  } catch (requireError) {
    // require() failed - module not loaded yet, will use async init
    // This is fine, the async init will handle it
  }

  // If we get here, client is not ready yet
  // Start async init and return null (callers should handle this)
  // Actually, let's throw to force proper async handling
  throw new Error("Supabase client not yet initialized. Use useSupabaseClient() hook or await createClientAsync().")
}

// Async version for proper initialization
export async function createClientAsync() {
  if (typeof window === "undefined") {
    throw new Error("createClientAsync() from supabase-browser.ts cannot be used in SSR.")
  }
  return ensureClient()
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
