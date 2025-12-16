"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { debugLog } from "@/lib/debug-log"
import { buildAuthHeaders } from "@/lib/auth-headers"

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

export function AgencyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      debugLog('agency-context.tsx:30', 'fetchData started', {}, 'J')

      const headers = await buildAuthHeaders()

      // Use API route instead of direct Supabase call
      const response = await fetch("/api/auth/me", { headers })
      
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

    // Poll for auth changes instead of using Supabase auth listener
    // This avoids creating Supabase client in the browser
    let mounted = true
    let pollInterval: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (typeof window === "undefined") {
        return
      }

      // Poll every 30 seconds for auth changes
      pollInterval = setInterval(() => {
        if (!mounted) return
        fetchData()
      }, 30000)
    }

    startPolling()

    return () => {
      mounted = false
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [fetchData])

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
