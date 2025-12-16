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
        // Use the async initialization function
        const { createClientAsync } = await import("@/lib/supabase-browser")
        const newClient = await createClientAsync()
        
        if (!mounted) return
        
        if (newClient && newClient.auth) {
          setClient(newClient)
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
