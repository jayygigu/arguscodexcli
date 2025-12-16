"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { debugLog } from "@/lib/debug-log"

interface Agency {
  id: string
  name: string
  logo: string | null
  verification_status: string
}

interface AgencyContextValue {
  user: any | null
  agency: Agency | null
  loading: boolean
  isVerified: boolean
  refresh: () => Promise<void>
}

const AgencyContext = createContext<AgencyContextValue | null>(null)

// Lazy Supabase client creation - only when needed and only in browser
function getSupabaseClientLazy() {
  // Never create client during SSR
  if (typeof window === "undefined") {
    throw new Error("Cannot create browser Supabase client during SSR")
  }

  try {
    // Dynamic import to ensure module is loaded
    const { createClient } = require("@/lib/supabase-browser")
    const client = createClient()
    
    // Validate client has auth property
    if (!client || !client.auth) {
      throw new Error("Supabase client is invalid - missing auth property")
    }
    
    return client
  } catch (error: any) {
    console.error("Failed to create Supabase client:", error)
    throw new Error(`Database connection error: ${error?.message || "Unknown error"}`)
  }
}

export function AgencyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      debugLog('agency-context.tsx:30', 'fetchData started', {}, 'J')

      // Use API route instead of direct Supabase call
      const response = await fetch("/api/auth/me")
      
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null)
          setAgency(null)
          setLoading(false)
          return
        }
        throw new Error(`Failed to fetch user: ${response.statusText}`)
      }

      const data = await response.json()
      debugLog('agency-context.tsx:38', 'getUser result', {hasUser:!!data.user,hasAgency:!!data.agency}, 'J')

      if (data.user) {
        setUser(data.user)
        setAgency(data.agency)
      } else {
        setUser(null)
        setAgency(null)
      }
    } catch (err: any) {
      debugLog('agency-context.tsx:58', 'fetchData error', {error:err?.message,stack:err?.stack}, 'L')
      console.error("Error fetching agency data:", err)
      setUser(null)
      setAgency(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Setup auth state listener with lazy client creation
    let subscription: any = null
    let mounted = true

    const setupAuthListener = async () => {
      try {
        // Only create client when actually needed, and only in browser
        if (typeof window === "undefined") {
          return
        }

        // Wait a bit to ensure everything is loaded
        await new Promise((resolve) => setTimeout(resolve, 100))

        if (!mounted) return

        const supabase = getSupabaseClientLazy()
        
        if (!supabase || !supabase.auth) {
          console.error("Supabase client invalid - cannot setup auth listener")
          return
        }

        const {
          data: { subscription: sub },
        } = supabase.auth.onAuthStateChange((event) => {
          if (!mounted) return
          
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            fetchData()
          } else if (event === "SIGNED_OUT") {
            setUser(null)
            setAgency(null)
            router.push("/agence/login")
          }
        })
        
        subscription = sub
      } catch (error: any) {
        console.error("Failed to setup auth state listener:", error)
        // Don't throw - app should still work without auth listener
      }
    }

    setupAuthListener()

    return () => {
      mounted = false
      if (subscription) {
        try {
          subscription.unsubscribe()
        } catch (err) {
          // Ignore unsubscribe errors
        }
      }
    }
  }, [fetchData, router])

  return (
    <AgencyContext.Provider
      value={{ user, agency, loading, isVerified: agency?.verification_status === "verified", refresh: fetchData }}
    >
      {children}
    </AgencyContext.Provider>
  )
}

export function useAgency() {
  const context = useContext(AgencyContext)
  if (!context) {
    throw new Error("useAgency must be used within AgencyProvider")
  }
  return context
}
