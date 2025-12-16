// This file now only exports constants, browser client is in supabase-browser.ts
import type { Database } from "@/types/database.types"

// Use environment variables with fallback to hardcoded values for backward compatibility
// In Next.js, NEXT_PUBLIC_ variables are available at build time on both client and server
// Fallback values ensure the app works even if env vars are not set
const getEnvVar = (key: string, fallback: string): string => {
  try {
    // In Next.js, process.env is available at build time
    // Access it safely using type assertion
    const env = (typeof globalThis !== "undefined" && (globalThis as any).process?.env) ||
      (typeof (globalThis as any).process !== "undefined" && (globalThis as any).process.env) ||
      {}

    const value = env[key]
    if (value && typeof value === "string" && value.trim() !== "") {
      return value
    }
  } catch {
    // Ignore errors accessing process.env
  }
  return fallback
}

export const SUPABASE_URL = getEnvVar(
  "NEXT_PUBLIC_SUPABASE_URL",
  "https://zsbtnlpppfjwurelpuli.supabase.co",
)
export const SUPABASE_ANON_KEY = getEnvVar(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYnRubHBwcGZqd3VyZWxwdWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MjUyOTcsImV4cCI6MjA3NzEwMTI5N30.rgT62TSM7KoJOq01WDvIGtaHXORyLvqJX3euGpoGdB4",
)

// Validate that we have valid values
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase configuration is missing. SUPABASE_URL and SUPABASE_ANON_KEY must be defined.")
}

export type { Database }
