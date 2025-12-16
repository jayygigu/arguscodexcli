"use client"

import { useState, useEffect } from "react"

/**
 * Hook to safely get Supabase client in browser environment
 * Only creates client after component mounts (browser only)
 * Returns null during SSR
 * Uses dynamic import to avoid loading supabase-browser module during SSR
 * Uses useState + useEffect to ensure client is only created after mount
 */
export function useSupabaseClient() {
  const [client, setClient] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    // Only create client after mount and in browser
    if (typeof window === "undefined") {
      return
    }

    // Skip if already created or initializing
    if (client || isInitializing) {
      return
    }

    let mounted = true
    setIsInitializing(true)

    const initClient = async () => {
      try {
        // Try to use synchronous createClient first (faster)
        // If it fails, fall back to async version
        try {
          const { createClient } = await import("@/lib/supabase-browser")
          // Try synchronous version first
          const syncClient = createClient()
          if (mounted && syncClient && syncClient.auth) {
            setClient(syncClient)
            setIsInitializing(false)
            return
          }
        } catch (syncError) {
          // If sync fails, try async version
          console.log("[useSupabaseClient] Sync failed, trying async:", syncError)
        }

        // Fall back to async version
        const { createClientAsync } = await import("@/lib/supabase-browser")
        const asyncClient = await createClientAsync()
        
        if (!mounted) return
        
        if (asyncClient && asyncClient.auth) {
          setClient(asyncClient)
        } else {
          console.error("[useSupabaseClient] Client created but invalid")
        }
      } catch (error: any) {
        if (!mounted) return
        console.error("[useSupabaseClient] Failed to create Supabase client:", error)
      } finally {
        if (mounted) {
          setIsInitializing(false)
        }
      }
    }

    initClient()

    return () => {
      mounted = false
    }
  }, [client, isInitializing])

  return client
}
