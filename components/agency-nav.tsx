import { createClient } from "@/lib/supabase-server"
import { AgencyNavClient } from "./agency-nav-client"

interface AgencyNavProps {
  currentPage?: string
}

export async function AgencyNav({ currentPage }: AgencyNavProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, logo, verification_status")
    .eq("owner_id", user.id)
    .maybeSingle()

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
