import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { AgencyNav } from "@/components/agency-nav"
import { MandatsTable } from "@/components/mandats-table"
import { LoadingState } from "@/components/loading-state"
import { Suspense } from "react"

export default async function MandatsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/agence/login")
  }

  const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).single()

  if (!agency) {
    redirect("/agence/dashboard")
  }

  let mandates = []
  let mandatesError = null

  try {
    const { data, error } = await supabase
      .from("mandates")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(100) // Prevent fetching too many at once

    if (error) throw error
    mandates = data || []
  } catch (err: any) {
    console.error("Error fetching mandates:", err)
    mandatesError = err.message
  }

  let candidatures = []
  if (mandates.length > 0) {
    try {
      const mandateIds = mandates.map((m) => m.id)
      const { data } = await supabase
        .from("mandate_interests")
        .select("*")
        .in("mandate_id", mandateIds)
        .order("created_at", { ascending: false })

      candidatures = data || []
    } catch (err) {
      console.error("Error fetching candidatures:", err)
    }
  }

  const assignedInvestigatorIds = mandates?.filter((m) => m.assigned_to).map((m) => m.assigned_to) || []
  const candidatureInvestigatorIds = candidatures?.map((c) => c.investigator_id) || []
  const allInvestigatorIds = [...new Set([...assignedInvestigatorIds, ...candidatureInvestigatorIds])]

  let investigators = []
  if (allInvestigatorIds.length > 0) {
    try {
      const { data: investigatorsData } = await supabase.from("profiles").select("*").in("id", allInvestigatorIds)
      investigators = investigatorsData || []
    } catch (err) {
      console.error("Error fetching investigators:", err)
    }
  }

  const mandatesWithData =
    mandates?.map((mandate) => ({
      ...mandate,
      assigned_investigator: investigators.find((inv) => inv.id === mandate.assigned_to) || null,
      candidatures:
        candidatures
          ?.filter((c) => c.mandate_id === mandate.id)
          .map((c) => ({
            ...c,
            investigator: investigators.find((inv) => inv.id === c.investigator_id) || null,
          })) || [],
    })) || []

  const activeMandates = mandatesWithData.filter(
    (m) => m.status === "open" || m.status === "assigned" || m.status === "in-progress",
  )
  const completedMandates = mandatesWithData.filter(
    (m) => m.status === "completed" || m.status === "cancelled" || m.status === "expired",
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AgencyNav currentPage="mandats" />
      <main className="max-w-[1920px] mx-auto px-6 py-6">
        {mandatesError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-900 font-semibold mb-2">Erreur de chargement</p>
            <p className="text-red-700 text-sm">{mandatesError}</p>
          </div>
        ) : (
          <Suspense fallback={<LoadingState message="Chargement des mandats..." />}>
            <MandatsTable activeMandates={activeMandates} completedMandates={completedMandates} agencyId={agency.id} />
          </Suspense>
        )}
      </main>
    </div>
  )
}
