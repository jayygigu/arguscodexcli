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

// Synchronous client creation - safe because we check typeof window first
export function createClient() {
  // CRITICAL: Never create browser client during SSR/build
  if (typeof window === "undefined") {
    throw new Error("createClient() from supabase-browser.ts cannot be used in SSR. Use createClient() from supabase-server.ts instead.")
  }

  // If client is already initialized, return it
  if (browserClient) {
    return browserClient
  }

  // Create client synchronously using require (only in browser)
  try {
    // Use require for synchronous loading in browser
    const { createClient: createSupabaseJSClient } = require("@supabase/supabase-js")
    
    // CRITICAL: Use inline values directly
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

    // Create client with validated values
    browserClient = createSupabaseJSClient<Database>(trimmedUrl, trimmedKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
    
    // Validate client was created
    if (!browserClient || !browserClient.auth) {
      browserClient = null
      throw new Error("browserClient is invalid after creation")
    }
    
    return browserClient
  } catch (error: any) {
    browserClient = null
    const errorMsg = error?.message || String(error) || "Unknown error"
    console.error("[Supabase] Failed to create browser client:", errorMsg)
    throw new Error(`Failed to create browser Supabase client: ${errorMsg}`)
  }
}

// Async version for proper initialization
export async function createClientAsync() {
  if (typeof window === "undefined") {
    throw new Error("createClientAsync() from supabase-browser.ts cannot be used in SSR.")
  }
  
  if (browserClient) {
    return browserClient
  }
  
  // Use dynamic import for async version
  const { createClient: createSupabaseJSClient } = await import("@supabase/supabase-js")
  
  const url = String(SUPABASE_URL_INLINE).trim()
  const key = String(SUPABASE_ANON_KEY_INLINE).trim()

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

  browserClient = createSupabaseJSClient<Database>(trimmedUrl, trimmedKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  
  if (!browserClient || !browserClient.auth) {
    browserClient = null
    throw new Error("browserClient is invalid after creation")
  }
  
  return browserClient
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
