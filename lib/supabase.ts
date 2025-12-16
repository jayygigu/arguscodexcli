// This file now only exports constants, browser client is in supabase-browser.ts
import type { Database } from "@/types/database.types"

// In Next.js, NEXT_PUBLIC_ variables are replaced at build time
// If not defined, they become undefined in the compiled code
// We use hardcoded defaults that are always available
const SUPABASE_URL_DEFAULT = "https://zsbtnlpppfjwurelpuli.supabase.co"
const SUPABASE_ANON_KEY_DEFAULT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4"

// Access environment variables - Next.js replaces NEXT_PUBLIC_* at build time
// Use @ts-ignore to avoid TypeScript errors with process.env
// @ts-ignore - process is available at runtime in Node.js/Next.js
const envUrl = typeof process !== "undefined" && process.env ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined
// @ts-ignore
const envKey =
  typeof process !== "undefined" && process.env ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined

// Export constants with guaranteed fallback - ensures values are ALWAYS defined
export const SUPABASE_URL: string = (envUrl && typeof envUrl === "string" && envUrl.trim() !== "" ? envUrl : SUPABASE_URL_DEFAULT) as string

export const SUPABASE_ANON_KEY: string = (envKey && typeof envKey === "string" && envKey.trim() !== "" ? envKey : SUPABASE_ANON_KEY_DEFAULT) as string

// Runtime validation - this will catch any issues during module load
if (!SUPABASE_URL || SUPABASE_URL.trim() === "" || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.trim() === "") {
  console.error("❌ Supabase configuration error:", {
    url: SUPABASE_URL ? "defined" : "missing",
    key: SUPABASE_ANON_KEY ? "defined" : "missing",
  })
  throw new Error(
    "Supabase configuration is invalid. SUPABASE_URL and SUPABASE_ANON_KEY must be non-empty strings.",
  )
}

export type { Database }
