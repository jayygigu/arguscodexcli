import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

const SUPABASE_URL = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

console.log("[v0] supabase-browser.ts loaded")
console.log("[v0] SUPABASE_URL:", SUPABASE_URL)
console.log("[v0] typeof window:", typeof window)

// Singleton instance - only created on client side
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  console.log("[v0] createClient() called, typeof window:", typeof window)

  if (typeof window === "undefined") {
    console.log("[v0] createClient() - server side, returning null")
    return null as unknown as ReturnType<typeof createBrowserClient<Database>>
  }

  if (browserClient) {
    console.log("[v0] createClient() - returning existing browserClient")
    return browserClient
  }

  console.log("[v0] createClient() - creating new browserClient...")
  try {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    console.log("[v0] createClient() - browserClient created successfully:", !!browserClient)
    console.log("[v0] createClient() - browserClient.auth:", !!browserClient?.auth)
  } catch (error) {
    console.error("[v0] createClient() - ERROR creating browserClient:", error)
  }

  return browserClient!
}

// Alias for backward compatibility
export const createBrowserSupabaseClient = createClient
