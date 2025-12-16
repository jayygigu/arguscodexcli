"use client"

import { useState, useEffect, useMemo } from "react"

/**
 * Hook to safely get Supabase client in browser environment
 * Only creates client after component mounts (browser only)
 * Returns null during SSR
 * Uses dynamic import to avoid loading supabase-browser module during SSR
 * Uses useState + useEffect to ensure client is only created after mount
 * CRITICAL: Never returns a client without valid auth property
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
        if (!newClient) {
          throw new Error("Client is null or undefined")
        }
        
        if (!newClient.auth) {
          throw new Error("Client missing auth property")
        }
        
        if (typeof newClient.auth !== "object") {
          throw new Error("Client auth is not an object")
        }
        
        if (typeof newClient.auth.getSession !== "function") {
          throw new Error("Client auth missing getSession method")
        }
        
        if (typeof newClient.auth.getUser !== "function") {
          throw new Error("Client auth missing getUser method")
        }
        
        // All validations passed, set the client
        setClient(newClient)
        setError(null)
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
          // Don't set client to null, keep it null
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

  // CRITICAL: Memoize client with strict validation
  // Only return client if it has all required properties
  return useMemo(() => {
    try {
      if (!client) {
        return null
      }
      
      // Validate client structure
      if (!client.auth) {
        console.warn("[useSupabaseClient] Client missing auth property")
        return null
      }
      
      if (typeof client.auth !== "object") {
        console.warn("[useSupabaseClient] Client auth is not an object")
        return null
      }
      
      if (typeof client.auth.getSession !== "function") {
        console.warn("[useSupabaseClient] Client auth missing getSession method")
        return null
      }
      
      if (typeof client.auth.getUser !== "function") {
        console.warn("[useSupabaseClient] Client auth missing getUser method")
        return null
      }
      
      // All validations passed
      return client
    } catch (error) {
      console.error("[useSupabaseClient] Error validating client:", error)
      return null
    }
  }, [client])
}
