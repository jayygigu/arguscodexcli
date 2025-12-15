"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAgency } from "@/contexts/agency-context"

interface UseAgencyAuthOptions {
  requireVerified?: boolean
}

export function useAgencyAuth(options: UseAgencyAuthOptions = {}) {
  const { requireVerified = false } = options
  const { user, agency, loading, isVerified } = useAgency()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/agence/login")
      return
    }

    if (requireVerified && !isVerified) {
      router.push("/agence/profil")
    }
  }, [loading, user, isVerified, requireVerified, router])

  return { user, agency, loading, isVerified }
}
