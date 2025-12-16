"use client"

import { useMemo, useState, useEffect } from "react"

/**
 * Hook to safely get Supabase client in browser environment
 * Only creates client after component mounts (browser only)
 * Returns null during SSR
 * Uses dynamic import to avoid loading supabase-browser module during SSR
 * Uses useState + useEffect to ensure client is only created after mount
 */
export function useSupabaseClient() {
  const [client, setClient] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Mark as mounted - only runs in browser
    setMounted(true)
  }, [])

  useMemo(() => {
    // Only create client after mount and in browser
    if (!mounted || typeof window === "undefined") {
      return null
    }

    if (client) {
      return client
    }

    try {
      // Dynamic import to avoid loading module during SSR
      // This ensures the module is only loaded in browser
      const { createClient } = require("@/lib/supabase-browser")
      const newClient = createClient()
      
      if (newClient && newClient.auth) {
        setClient(newClient)
        return newClient
      }
      
      console.error("[useSupabaseClient] Client created but invalid")
      return null
    } catch (error: any) {
      console.error("[useSupabaseClient] Failed to create Supabase client:", error)
      return null
    }
  }, [mounted, client])

  return client
}
