import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

let browserClient: SupabaseClient<Database> | null = null

export function createClient() {
  if (typeof window === "undefined") {
    return null
  }

  if (!browserClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase browser env vars are missing")
    }

    browserClient = createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return browserClient
}

export async function createClientAsync() {
  return createClient()
}

export const createBrowserSupabaseClient = createClient
