import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database.types"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase"

// Validate configuration values are strings before use
function validateConfig(): void {
  if (!SUPABASE_URL || typeof SUPABASE_URL !== "string") {
    throw new Error(`Invalid SUPABASE_URL: ${typeof SUPABASE_URL}`)
  }
  if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== "string") {
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
    const client = createServerClient<Database>(url, key, {
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
    
    // CRITICAL: Validate client has auth property
    if (!client || !client.auth) {
      throw new Error("Server Supabase client missing auth property")
    }
    
    // Validate auth has required methods
    if (typeof client.auth.getUser !== "function" || typeof client.auth.getSession !== "function") {
      throw new Error("Server Supabase client auth missing required methods")
    }
    
    return client
  } catch (error: any) {
    throw new Error(`Failed to create server Supabase client: ${error?.message || error}`)
  }
}

export const createServerSupabaseClient = createClient
