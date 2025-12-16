// This file now only exports constants, browser client is in supabase-browser.ts
import type { Database } from "@/types/database.types"

// Use environment variables with fallback to hardcoded values for backward compatibility
// In Next.js, NEXT_PUBLIC_ variables are available at build time on both client and server
declare const process: {
  env: {
    [key: string]: string | undefined
  }
}

const getEnvVar = (key: string, fallback: string): string => {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key]!
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

export type { Database }
