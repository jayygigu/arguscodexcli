import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { AgencyNav } from "@/components/agency-nav"
import { ArrowLeft } from "lucide-react"
import Link from "@/components/safe-link"
import { Button } from "@/components/ui/button"
import { RatingForm } from "@/components/rating-form"
import { Breadcrumb } from "@/components/breadcrumb"
import { getVerifiedAgencyAuth } from "@/lib/agency-auth"

export default async function EvaluerMandatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { agency } = await getVerifiedAgencyAuth()

  const supabase = await createClient()

  const { data: mandate } = await supabase
    .from("mandates")
    .select("*, profiles:assigned_to(id, name)")
    .eq("id", id)
    .eq("agency_id", agency.id)
    .maybeSingle()

  if (!mandate || !mandate.assigned_to || mandate.status !== "completed") {
    redirect(`/agence/mandats/${id}`)
  }

  const { data: existingRating } = await supabase
    .from("mandate_ratings")
    .select("id")
    .eq("mandate_id", id)
    .maybeSingle()

  if (existingRating) {
    redirect(`/agence/mandats/${id}`)
  }

  const investigator = mandate.profiles

  return (
    <div className="min-h-screen bg-white">
      <AgencyNav currentPage="mandats" />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Mandats", href: "/agence/mandats" },
            { label: mandate.title, href: `/agence/mandats/${id}` },
          ]}
          currentLabel="Évaluer"
        />

        <div className="mb-6">
          <Link href={`/agence/mandats/${id}`}>
            <Button variant="ghost" size="sm" className="font-urbanist hover:bg-[#0f4c75]/5 hover:text-[#0f4c75]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au mandat
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-montserrat font-bold text-gray-900 mb-2">Évaluer la prestation</h1>
          <p className="text-sm font-urbanist text-gray-600 mb-6">
            Mandat: <span className="font-semibold">{mandate.title}</span>
          </p>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm font-urbanist font-medium text-blue-900 mb-1">
              Enquêteur: {investigator?.name || "Non disponible"}
            </p>
            <p className="text-xs font-urbanist text-blue-700">
              Votre évaluation aidera d'autres agences à choisir le bon enquêteur
            </p>
          </div>

          <RatingForm mandateId={id} investigatorId={mandate.assigned_to} agencyId={agency.id} />
        </div>
      </main>
    </div>
  )
}
