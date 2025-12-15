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
    const supabase = createClient()

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setAgency(null)
        setLoading(false)
        return
      }

      setUser(authUser)

      const { data: agencyData } = await supabase
        .from("agencies")
        .select("id, name, logo, verification_status")
        .eq("owner_id", authUser.id)
        .maybeSingle()

      setAgency(agencyData)
    } catch {
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
