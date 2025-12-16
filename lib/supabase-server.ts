import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase"

// Validate configuration values are strings before use
function validateConfig(): void {
  if (!SUPABASE_URL || typeof SUPABASE_URL !== "string" || SUPABASE_URL.trim() === "") {
    throw new Error(`Invalid SUPABASE_URL: ${typeof SUPABASE_URL}`)
  }
  if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== "string" || SUPABASE_ANON_KEY.trim() === "") {
    throw new Error(`Invalid SUPABASE_ANON_KEY: ${typeof SUPABASE_ANON_KEY}`)
  }
}

export async function createClient() {
  // Validate configuration before creating client
  validateConfig()

  // Ensure we have valid string values
  const url = String(SUPABASE_URL).trim()
  const key = String(SUPABASE_ANON_KEY).trim()

  if (!url || !key) {
    throw new Error(`Supabase configuration invalid: url=${!!url}, key=${!!key}`)
  }

  const cookieStore = await cookies()

  try {
    return createServerClient<Database>(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component - ignored
          }
        },
      },
    })
  } catch (error: any) {
    throw new Error(`Failed to create server Supabase client: ${error?.message || error}`)
  }
}

export const createServerSupabaseClient = createClient
