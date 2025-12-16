"use client"

import { useState, useEffect, useMemo } from "react"

/**
 * Hook to safely get Supabase client in browser environment
 * Only creates client after component mounts (browser only)
 * Returns null during SSR
 * Uses dynamic import to avoid loading supabase-browser module during SSR
 * Uses useState + useEffect to ensure client is only created after mount
 */
export function useSupabaseClient() {
  const [client, setClient] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only create client after mount and in browser
    if (typeof window === "undefined") {
      return
    }

    // Skip if already created
    if (client) {
      return
    }

    let mounted = true
    let retryCount = 0
    const maxRetries = 3

    const initClient = async () => {
      try {
        // Use async version which is guaranteed to work
        const { createClientAsync } = await import("@/lib/supabase-browser")
        const newClient = await createClientAsync()
        
        if (!mounted) return
        
        // CRITICAL: Validate client has auth property before setting
        if (newClient && newClient.auth && typeof newClient.auth.getSession === "function") {
          setClient(newClient)
          setError(null)
        } else {
          throw new Error("Client created but invalid - missing auth property or methods")
        }
      } catch (error: any) {
        if (!mounted) return
        
        retryCount++
        if (retryCount < maxRetries) {
          // Retry after a short delay
          setTimeout(() => {
            if (mounted) {
              initClient()
            }
          }, 500 * retryCount)
        } else {
          console.error("[useSupabaseClient] Failed to create Supabase client after retries:", error)
          setError(error.message || "Failed to initialize Supabase client")
        }
      }
    }

    // Small delay to ensure window is fully ready
    const timeoutId = setTimeout(() => {
      initClient()
    }, 100)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [client])

  // Memoize client to prevent unnecessary re-renders
  // Only return client if it has auth property
  return useMemo(() => {
    if (client && client.auth && typeof client.auth.getSession === "function") {
      return client
    }
    return null
  }, [client])
}
