"use client"

import { useAgency } from "@/contexts/agency-context"
import { AgencyNavClient } from "./agency-nav-client"

interface AgencyNavProps {
  currentPage?: string
}

export function AgencyNav({ currentPage }: AgencyNavProps) {
  const { agency, loading } = useAgency()

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
