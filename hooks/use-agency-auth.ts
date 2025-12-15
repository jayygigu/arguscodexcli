"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"

interface UseAgencyAuthOptions {
  requireVerified?: boolean
}

interface UseAgencyAuthReturn {
  user: any
  agency: any
  loading: boolean
  isVerified: boolean
}

export function useAgencyAuth(options: UseAgencyAuthOptions = {}): UseAgencyAuthReturn {
  const { requireVerified = false } = options
  const [user, setUser] = useState<any>(null)
  const [agency, setAgency] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function fetchData() {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          router.push("/agence/login")
          return
        }

        setUser(authUser)

        const { data: agencyData } = await supabase
          .from("agencies")
          .select("*")
          .eq("owner_id", authUser.id)
          .maybeSingle()

        setAgency(agencyData)

        if (requireVerified && agencyData?.verification_status !== "verified") {
          router.push("/agence/profil")
          return
        }
      } catch (error) {
        console.error("Auth error:", error)
        router.push("/agence/login")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [requireVerified, router])

  return {
    user,
    agency,
    loading,
    isVerified: agency?.verification_status === "verified",
  }
}
