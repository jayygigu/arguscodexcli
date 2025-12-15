"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-browser"

interface Agency {
  id: string
  name: string
  verification_status: string
  [key: string]: any
}

interface UseAgencyAuthOptions {
  requireVerified?: boolean
}

export function useAgencyAuth(options: UseAgencyAuthOptions = {}) {
  const { requireVerified = false } = options
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/agence/login")
          return
        }

        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle()

        if (agencyError) {
          setError(agencyError.message)
          return
        }

        if (!agencyData) {
          router.push("/agence/profil")
          return
        }

        if (requireVerified && agencyData.verification_status !== "verified") {
          router.push("/agence/profil")
          return
        }

        setAgency(agencyData)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [requireVerified, router, supabase])

  return { agency, loading, error }
}
