"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase-browser"
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

export function AgencyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    try {
      // #region agent log
      debugLog('agency-context.tsx:30', 'fetchData started', {}, 'J')
      // #endregion

      const supabase = createClient()

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      // #region agent log
      debugLog('agency-context.tsx:38', 'getUser result', {hasUser:!!authUser,error:authError?.message}, 'J')
      // #endregion

      if (!authUser) {
        setUser(null)
        setAgency(null)
        setLoading(false)
        return
      }

      setUser(authUser)

      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("id, name, logo, verification_status")
        .eq("owner_id", authUser.id)
        .maybeSingle()

      // #region agent log
      debugLog('agency-context.tsx:53', 'Agency query result', {hasAgency:!!agencyData,error:agencyError?.message,code:agencyError?.code}, 'K')
      // #endregion

      setAgency(agencyData)
    } catch (err: any) {
      // #region agent log
      debugLog('agency-context.tsx:58', 'fetchData error', {error:err?.message,stack:err?.stack}, 'L')
      // #endregion
      console.error("Error fetching agency data:", err)
      setUser(null)
      setAgency(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Create client with error handling
    let subscription: any = null
    try {
      const supabase = createClient()
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((event) => {
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
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
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
