import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

let browserClient: SupabaseClient<Database> | null = null

function getFallbackClient(): SupabaseClient<Database> {
  // Minimal mock to avoid hard crashes during SSR/hydration
  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null }
      },
      async getUser() {
        return { data: { user: null }, error: null }
      },
      // @ts-ignore
    },
  } as SupabaseClient<Database>
}

export function createClient() {
  if (!browserClient) {
    if (typeof window === "undefined") {
      // During SSR/hydration, return a harmless mock
      return getFallbackClient()
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Supabase browser env vars are missing")
      return getFallbackClient()
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
