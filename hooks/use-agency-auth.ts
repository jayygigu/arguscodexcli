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

interface User {
  id: string
  email: string
  [key: string]: any
}

interface UseAgencyAuthOptions {
  requireVerified?: boolean // Gardé pour compatibilité mais ignoré
}

interface UseAgencyAuthReturn {
  user: User | null
  agency: Agency | null
  loading: boolean
  error: string | null
}

/**
 * Hook pour récupérer les données de l'agence côté client
 * Note: La vérification d'accès est déjà faite dans proxy.ts
 * Ce hook est utilisé pour récupérer les données de l'agence après le chargement
 */
export function useAgencyAuth(_options: UseAgencyAuthOptions = {}): UseAgencyAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchAgencyData() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          // Le proxy devrait déjà avoir redirigé, mais par sécurité
          router.push("/agence/login")
          return
        }

        setUser(authUser as User)

        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .select("*")
          .eq("owner_id", authUser.id)
          .maybeSingle()

        if (agencyError) {
          setError(agencyError.message)
          return
        }

        if (!agencyData) {
          // Le proxy devrait déjà avoir redirigé, mais par sécurité
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

    fetchAgencyData()
  }, [router, supabase])

  return { user, agency, loading, error }
}
