"use client"

import { useMemo } from "react"

/**
 * Hook to safely get Supabase client in browser environment
 * Only creates client after component mounts (browser only)
 * Returns null during SSR
 * Uses dynamic import to avoid loading supabase-browser module during SSR
 */
export function useSupabaseClient() {
  return useMemo(() => {
    // Only create client in browser
    if (typeof window === "undefined") {
      return null
    }

    try {
      // Dynamic import to avoid loading module during SSR
      // This ensures the module is only loaded in browser
      const { createClient } = require("@/lib/supabase-browser")
      return createClient()
    } catch (error: any) {
      console.error("Failed to create Supabase client:", error)
      return null
    }
  }, [])
}
