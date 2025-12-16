// Supabase configuration loaded from environment
// Use NEXT_PUBLIC_* for browser code, and SERVER_* (or plain) for server code

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ""

export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Export Database type for TypeScript
export type { Database } from "@/types/database.types"
