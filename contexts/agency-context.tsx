"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"

console.log("[v0] agency-context.tsx loaded")

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
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  console.log("[v0] AgencyProvider render - mounted:", mounted, "loading:", loading, "user:", !!user)

  useEffect(() => {
    console.log("[v0] AgencyProvider useEffect[mount] - setting mounted=true")
    setMounted(true)
  }, [])

  const fetchData = useCallback(async () => {
    console.log("[v0] fetchData() called, typeof window:", typeof window)

    if (typeof window === "undefined") {
      console.log("[v0] fetchData() - server side, returning early")
      setLoading(false)
      return
    }

    console.log("[v0] fetchData() - calling createClient()...")
    const supabase = createClient()
    console.log("[v0] fetchData() - supabase client:", !!supabase)

    if (!supabase) {
      console.log("[v0] fetchData() - no supabase client, returning early")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] fetchData() - calling supabase.auth.getUser()...")
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      console.log("[v0] fetchData() - getUser result:", {
        hasUser: !!authUser,
        userId: authUser?.id,
        email: authUser?.email,
        error: authError?.message,
      })

      if (authError || !authUser) {
        console.log("[v0] fetchData() - no user or error, clearing state")
        setUser(null)
        setAgency(null)
        return
      }

      setUser(authUser)
      console.log("[v0] fetchData() - user set, fetching agency...")

      const { data: agencyData, error: agencyError } = await supabase
        .from("agencies")
        .select("id, name, logo, verification_status")
        .eq("owner_id", authUser.id)
        .maybeSingle()

      console.log("[v0] fetchData() - agency result:", {
        hasAgency: !!agencyData,
        agencyId: agencyData?.id,
        agencyName: agencyData?.name,
        verificationStatus: agencyData?.verification_status,
        error: agencyError?.message,
      })

      setAgency(agencyData)
    } catch (error) {
      console.error("[v0] fetchData() - CATCH error:", error)
      setUser(null)
      setAgency(null)
    } finally {
      console.log("[v0] fetchData() - finally, setting loading=false")
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log("[v0] AgencyProvider useEffect[mounted] - mounted:", mounted)
    if (!mounted) return

    console.log("[v0] AgencyProvider - calling fetchData()...")
    fetchData()

    console.log("[v0] AgencyProvider - setting up auth listener...")
    const supabase = createClient()
    if (!supabase) {
      console.log("[v0] AgencyProvider - no supabase client for auth listener")
      return
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[v0] onAuthStateChange:", { event, hasSession: !!session, userId: session?.user?.id })

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        console.log("[v0] onAuthStateChange - SIGNED_IN/TOKEN_REFRESHED, calling fetchData()")
        fetchData()
      } else if (event === "SIGNED_OUT") {
        console.log("[v0] onAuthStateChange - SIGNED_OUT, clearing state and redirecting")
        setUser(null)
        setAgency(null)
        router.push("/agence/login")
      }
    })

    return () => {
      console.log("[v0] AgencyProvider - unsubscribing auth listener")
      subscription.unsubscribe()
    }
  }, [mounted, fetchData, router])

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
