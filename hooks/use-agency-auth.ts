"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-browser"

interface Agency {
  id: string
  name: string
  verification_status: string
  [key: string]: any
}

interface User {
  id: string
  email: string
  [key: string]: any
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
export function useAgencyAuth(): UseAgencyAuthReturn {
  const [user, setUser] = useState<any>(null)
  const [agency, setAgency] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (authUser) {
        setUser(authUser)
        const { data: agencyData } = await supabase
          .from("agencies")
          .select("*")
          .eq("owner_id", authUser.id)
          .maybeSingle()
        setAgency(agencyData)
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  return { user, agency, loading, isVerified: agency?.verification_status === "verified" }
}
