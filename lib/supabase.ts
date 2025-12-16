// This file is kept for server-side code compatibility
// It exports hardcoded Supabase configuration values

// CRITICAL: Hardcoded values to ensure they're always available in production
// These values are used by server-side code (proxy.ts, supabase-server.ts)
export const SUPABASE_URL = "https://zsbtnlpppfjwurelpuli.supabase.co"
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

// Validate values at module load time
if (typeof SUPABASE_URL !== "string" || SUPABASE_URL.trim() === "") {
  throw new Error("SUPABASE_URL is invalid")
}

if (typeof SUPABASE_ANON_KEY !== "string" || SUPABASE_ANON_KEY.trim() === "") {
  throw new Error("SUPABASE_ANON_KEY is invalid")
}

// Export Database type for TypeScript
export type { Database } from "@/types/database.types"
