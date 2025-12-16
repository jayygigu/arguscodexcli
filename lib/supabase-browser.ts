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
      
      // CRITICAL: Validate client has auth property before returning
      if (!client) {
        throw new Error("createSupabaseJSClient returned null or undefined")
      }
      
      if (!client.auth) {
        throw new Error("browserClient.auth is undefined after creation")
      }
      
      // Additional validation: ensure auth has required methods
      if (typeof client.auth.getSession !== "function" || typeof client.auth.getUser !== "function") {
        throw new Error("browserClient.auth is missing required methods")
      }
      
      browserClient = client
      return client
    } catch (error: any) {
      initPromise = null // Reset on failure
      browserClient = null // Clear invalid client
      const errorMsg = error?.message || String(error) || "Unknown error"
      console.error("[Supabase] Client initialization failed:", errorMsg, error)
      // Return null to avoid throwing and breaking callers
      return null
    }
  })()

  return initPromise
}

// Synchronous API - ONLY returns if client is already initialized
// Otherwise throws error to force async usage
export function createClient() {
  // CRITICAL: Never create browser client during SSR/build
  if (typeof window === "undefined") {
    throw new Error("createClient() from supabase-browser.ts cannot be used in SSR. Use createClient() from supabase-server.ts instead.")
  }

  // If client is already initialized, return it synchronously
  if (browserClient && browserClient.auth) {
    return browserClient
  }

  // Start initialization in background (non-blocking)
  ensureClient().catch((err) => {
    console.error("[Supabase] Background initialization failed:", err)
  })

  // Return null while initializing instead of throwing
  return null
}

// Async version for proper initialization - ALWAYS use this in new code
export async function createClientAsync() {
  if (typeof window === "undefined") {
    throw new Error("createClientAsync() from supabase-browser.ts cannot be used in SSR.")
  }
  return ensureClient()
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
