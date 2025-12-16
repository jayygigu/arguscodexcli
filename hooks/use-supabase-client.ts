"use client"

import { useMemo } from "react"
import { createClient } from "@/lib/supabase-browser"

/**
 * Hook to safely get Supabase client in browser environment
 * Only creates client after component mounts (browser only)
 * Returns null during SSR
 */
export function useSupabaseClient() {
  return useMemo(() => {
    // Only create client in browser
    if (typeof window === "undefined") {
      return null
    }

    try {
      return createClient()
    } catch (error: any) {
      console.error("Failed to create Supabase client:", error)
      return null
    }
  }, [])
}

