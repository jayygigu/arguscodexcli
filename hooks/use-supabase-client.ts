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
    if (typeof window === "undefined") return
    if (client) return

    let mounted = true

    const initClient = async () => {
      try {
        const { createClientAsync } = await import("@/lib/supabase-browser")
        const newClient = await createClientAsync()
        if (!mounted) return
        setClient(newClient)
        setError(null)
      } catch (err: any) {
        if (!mounted) return
        console.error("[useSupabaseClient] init failed", err)
        setError(err?.message || "Failed to initialize Supabase client")
      }
    }

    initClient()

    return () => {
      mounted = false
    }
  }, [client])

  return useMemo(() => client, [client])
}
