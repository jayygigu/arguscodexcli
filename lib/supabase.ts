import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database.types"

export const SUPABASE_URL = "https://zsbtnlpppfjwurelpuli.supabase.co"
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

// Browser client - uses cookies via @supabase/ssr
export function createBrowserSupabase() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}
