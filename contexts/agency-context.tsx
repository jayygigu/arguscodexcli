"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"

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
      fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agency-context.tsx:30',message:'fetchData started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion

      const supabase = createClient()

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agency-context.tsx:38',message:'getUser result',data:{hasUser:!!authUser,error:authError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
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
      fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agency-context.tsx:53',message:'Agency query result',data:{hasAgency:!!agencyData,error:agencyError?.message,code:agencyError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
      // #endregion

      setAgency(agencyData)
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/25000e01-2f8f-4671-80ec-977a69923072',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agency-context.tsx:58',message:'fetchData error',data:{error:err?.message,stack:err?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
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

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchData()
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setAgency(null)
        router.push("/agence/login")
      }
    })

    return () => subscription.unsubscribe()
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
