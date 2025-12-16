import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase"

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (typeof window === "undefined") {
    // SSR: create fresh client each time (won't persist anyway)
    return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  // Browser: use singleton
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  return browserClient
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
