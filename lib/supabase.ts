// This file exports Supabase configuration constants
// NOTE: For browser/client code, use the inline values in supabase-browser.ts instead
// This file is kept for server-side code compatibility
import type { Database } from "@/types/database.types"

// Hardcoded Supabase configuration - ALWAYS available
const SUPABASE_URL_VALUE = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY_VALUE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

// Validate values at module load time
if (!SUPABASE_URL_VALUE || typeof SUPABASE_URL_VALUE !== "string" || SUPABASE_URL_VALUE.trim() === "") {
  throw new Error("SUPABASE_URL_VALUE is invalid")
}
if (!SUPABASE_ANON_KEY_VALUE || typeof SUPABASE_ANON_KEY_VALUE !== "string" || SUPABASE_ANON_KEY_VALUE.trim() === "") {
  throw new Error("SUPABASE_ANON_KEY_VALUE is invalid")
}

// Export as constants - these are guaranteed to be strings
export const SUPABASE_URL: string = SUPABASE_URL_VALUE
export const SUPABASE_ANON_KEY: string = SUPABASE_ANON_KEY_VALUE

// Final validation of exported constants
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase configuration failed: exported constants are invalid")
}

export type { Database }
