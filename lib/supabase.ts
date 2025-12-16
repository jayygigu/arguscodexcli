// This file now only exports constants, browser client is in supabase-browser.ts
import type { Database } from "@/types/database.types"

// Hardcoded Supabase configuration
// These values are always available and ensure the app works in production
// If you need to override them, set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// in your environment variables, but these defaults ensure the app always works
export const SUPABASE_URL = "https://zsbtnlpppfjwurelpuli.supabase.co"
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

// Runtime validation - this will catch any issues during module load
if (!SUPABASE_URL || SUPABASE_URL.trim() === "" || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.trim() === "") {
  throw new Error(
    "Supabase configuration is invalid. SUPABASE_URL and SUPABASE_ANON_KEY must be non-empty strings.",
  )
}

export type { Database }
