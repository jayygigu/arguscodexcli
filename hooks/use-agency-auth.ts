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

/**
 * Hook pour récupérer les données de l'agence côté client
 * Note: La vérification d'accès est déjà faite dans proxy.ts
 * Ce hook est utilisé pour récupérer les données de l'agence après le chargement
 */
export function useAgencyAuth(options: UseAgencyAuthOptions = {}): UseAgencyAuthReturn {
  const { requireVerified = false } = options
  const [user, setUser] = useState<any>(null)
  const [agency, setAgency] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      try {
        if (!supabase) {
          throw new Error("Supabase client not initialized")
        }

        const authResponse = await supabase.auth.getUser()

        if (authResponse.error) {
          console.error("Auth error:", authResponse.error)
          setLoading(false)
          router.push("/agence/login")
          return
        }

        const authUser = authResponse.data?.user

        if (!authUser) {
          setLoading(false)
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
        console.error("Error fetching agency auth:", error)
        router.push("/agence/login")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, requireVerified, router])

  return { user, agency, loading, isVerified: agency?.verification_status === "verified" }
}
