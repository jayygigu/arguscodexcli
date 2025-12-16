import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase"

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// Validate configuration values are strings before use
function validateConfig(): void {
  if (!SUPABASE_URL || typeof SUPABASE_URL !== "string" || SUPABASE_URL.trim() === "") {
    throw new Error(`Invalid SUPABASE_URL: ${typeof SUPABASE_URL} - ${SUPABASE_URL}`)
  }
  if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== "string" || SUPABASE_ANON_KEY.trim() === "") {
    throw new Error(`Invalid SUPABASE_ANON_KEY: ${typeof SUPABASE_ANON_KEY}`)
  }
}

export function createClient() {
  // Validate configuration before creating client
  validateConfig()

  // Ensure we have valid string values
  const url = String(SUPABASE_URL).trim()
  const key = String(SUPABASE_ANON_KEY).trim()

  if (!url || !key) {
    throw new Error(`Supabase configuration invalid: url=${!!url}, key=${!!key}`)
  }

  if (typeof window === "undefined") {
    // SSR: create fresh client each time (won't persist anyway)
    try {
      return createBrowserClient<Database>(url, key)
    } catch (error: any) {
      throw new Error(`Failed to create SSR Supabase client: ${error?.message || error}`)
    }
  }

  // Browser: use singleton
  if (!browserClient) {
    try {
      browserClient = createBrowserClient<Database>(url, key)
    } catch (error: any) {
      throw new Error(`Failed to create browser Supabase client: ${error?.message || error}`)
    }
  }

  return browserClient
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
