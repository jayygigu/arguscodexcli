"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-browser"
import { AgencyNavClient } from "./agency-nav-client"

interface AgencyNavProps {
  currentPage?: string
}

interface Agency {
  id: string
  name: string
  logo: string | null
  verification_status: string
}

export function AgencyNav({ currentPage }: AgencyNavProps) {
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchAgency() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from("agencies")
        .select("id, name, logo, verification_status")
        .eq("owner_id", user.id)
        .maybeSingle()

      setAgency(data)
      setLoading(false)
    }

    fetchAgency()
  }, [supabase])

  if (loading) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
          </div>
        </div>
      </header>
    )
  }

  if (!agency) {
    return null
  }

  return (
    <AgencyNavClient
      currentPage={currentPage}
      agencyId={agency.id}
      agencyName={agency.name}
      agencyLogoUrl={agency.logo}
      isVerified={agency.verification_status === "verified"}
    />
  )
}
