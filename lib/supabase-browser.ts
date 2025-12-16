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
let createSupabaseJSClientPromise: Promise<any> | null = null

// Lazy load @supabase/supabase-js only when needed (browser only)
async function getCreateClient() {
  if (typeof window === "undefined") {
    throw new Error("Cannot load @supabase/supabase-js during SSR")
  }
  
  if (!createSupabaseJSClientPromise) {
    createSupabaseJSClientPromise = import("@supabase/supabase-js").then((mod) => mod.createClient)
  }
  
  return createSupabaseJSClientPromise
}

// Factory function that creates client with guaranteed values
async function createSupabaseClient() {
  // CRITICAL: Lazy import - only import @supabase/supabase-js when actually needed (browser only)
  // This prevents the module from being loaded during SSR/build
  const createSupabaseJSClient = await getCreateClient()
  
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

  try {
    // Use @supabase/supabase-js directly instead of @supabase/ssr
    // This should be more reliable for browser client
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
    // For synchronous API, we need to create client synchronously
    // But we can't use async/await here, so we'll use a synchronous require
    // This is safe because we've already checked typeof window
    try {
      // Use require for synchronous loading in browser
      const { createClient: createSupabaseJSClient } = require("@supabase/supabase-js")
      
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
