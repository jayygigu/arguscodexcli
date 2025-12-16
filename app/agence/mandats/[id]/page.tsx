import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import Link from "@/components/safe-link"
import { Button } from "@/components/ui/button"
import { getSpecialtyLabel, getPriorityLabel } from "@/constants/specialties"
import { AgencyNav } from "@/components/agency-nav"
import { ArrowLeft, AlertCircle, Clock, MessageSquare, User, Star, TrendingUp, FileText } from "lucide-react"
import { CandidatureActions } from "@/components/candidature-actions"
import { StatusBadge } from "@/components/status-badge"
import { Breadcrumb } from "@/components/breadcrumb"
import { ActionFeedback } from "@/components/action-feedback"
import { getVerifiedAgencyAuth } from "@/lib/agency-auth"

function isValidUUID(str: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default async function MandateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string; investigator?: string }>
}) {
  const { id } = await params
  const search = await searchParams

  if (!isValidUUID(id)) {
    redirect("/agence/mandats")
  }

  const { agency } = await getVerifiedAgencyAuth()

  const supabase = await createClient()

  const { data: mandate, error: mandateError } = await supabase
    .from("mandates")
    .select("*")
    .eq("id", id)
    .eq("agency_id", agency.id)
    .maybeSingle()

  if (mandateError || !mandate) {
    redirect("/agence/mandats")
  }

  let assignedInvestigator = null

  if (mandate.assigned_to) {
    const { data: investigator } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", mandate.assigned_to)
      .maybeSingle()

    if (investigator) {
      assignedInvestigator = investigator
    }
  }

  const { data: interests } = await supabase
    .from("mandate_interests")
    .select(`
      *,
      profiles:investigator_id (
        id,
        name,
        license_number,
        phone,
        email,
        city,
        region,
        years_experience,
        availability_status
      )
    `)
    .eq("mandate_id", id)
    .order("created_at", { ascending: false })

  const candidatures = interests || []

  const candidaturesWithStats = await Promise.all(
    candidatures.map(async (c) => {
      const { data: stats } = await supabase
        .from("investigator_stats")
        .select("*")
        .eq("investigator_id", c.investigator_id)
        .maybeSingle()

      const { data: favorite } = await supabase
        .from("investigator_favorites")
        .select("id")
        .eq("agency_id", mandate.agency_id)
        .eq("investigator_id", c.investigator_id)
        .maybeSingle()

      const { data: history } = await supabase
        .from("mandates")
        .select("id, status")
        .eq("agency_id", mandate.agency_id)
        .eq("assigned_to", c.investigator_id)
        .eq("status", "completed")

      return {
        ...c,
        stats,
        isFavorite: !!favorite,
        completedMandates: history?.length || 0,
      }
    }),
  )

  const daysUntilRequired = Math.ceil(
    (new Date(mandate.date_required).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )
  const isUrgent = daysUntilRequired <= 7 && daysUntilRequired > 0
  const isOverdue = daysUntilRequired < 0

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "Ouvert"
      case "assigned":
        return "Assigné"
      case "in-progress":
        return "En cours"
      case "completed":
        return "Complété"
      case "cancelled":
        return "Annulé"
      case "expired":
        return "Expiré"
      default:
        return status
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "blue"
      case "assigned":
        return "yellow"
      case "in-progress":
        return "purple"
      case "completed":
        return "green"
      case "cancelled":
      case "expired":
        return "red"
      default:
        return "gray"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <AgencyNav currentPage="mandats" />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumb items={[{ label: "Mandats", href: "/agence/mandats" }]} currentLabel={mandate.title} />

        <div className="mb-6">
          <Link href="/agence/mandats">
            <Button variant="ghost" size="sm" className="font-semibold hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux mandats
            </Button>
          </Link>
        </div>

        {search.action === "rate" && search.investigator && mandate.status === "completed" && (
          <ActionFeedback
            type="success"
            title="Mandat complété avec succès"
            message="Prenez un moment pour évaluer la performance de l'enquêteur sur ce mandat."
            actions={[
              {
                label: "Évaluer l'enquêteur",
                href: `/agence/enqueteurs/${search.investigator}?action=rate&mandate=${id}`,
                variant: "default",
              },
              {
                label: "Voir le profil",
                href: `/agence/enqueteurs/${search.investigator}`,
                variant: "outline",
              },
            ]}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-muted p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-4xl font-bold text-gray-900 leading-tight">{mandate.title}</h2>
                <div className="flex gap-2">
                  <StatusBadge
                    status={mandate.assignment_type}
                    label={mandate.assignment_type === "direct" ? "Direct" : "Public"}
                    variant={mandate.assignment_type === "direct" ? "purple" : "blue"}
                  />
                  <StatusBadge
                    status={mandate.status}
                    label={getStatusLabel(mandate.status)}
                    variant={getStatusVariant(mandate.status)}
                  />
                </div>
              </div>

              {/* Urgency alerts with better design */}
              {isUrgent && !isOverdue && mandate.status !== "completed" && (
                <div className="mb-6 p-5 bg-gradient-to-r from-orange-50 to-orange-100/50 border-2 border-orange-300 rounded-xl flex items-start gap-4 shadow-sm">
                  <Clock className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-base font-bold text-orange-900 mb-1">⚡ Mandat urgent</p>
                    <p className="text-sm text-orange-800">
                      Date requise dans {daysUntilRequired} jour{daysUntilRequired > 1 ? "s" : ""} seulement
                    </p>
                  </div>
                </div>
              )}

              {isOverdue && mandate.status !== "completed" && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-urbanist font-medium text-red-900">Mandat en retard</p>
                    <p className="text-xs font-urbanist text-red-700">
                      Date requise dépassée de {Math.abs(daysUntilRequired)} jour
                      {Math.abs(daysUntilRequired) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}

              {assignedInvestigator && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-urbanist font-semibold text-green-900 mb-2">Enquêteur assigné</p>
                      <p className="font-montserrat font-semibold text-green-900 text-lg">
                        {assignedInvestigator.name}
                      </p>
                      {assignedInvestigator.city && (
                        <p className="text-sm font-urbanist text-green-700">{assignedInvestigator.city}</p>
                      )}
                      {assignedInvestigator.phone && (
                        <p className="text-sm font-urbanist text-green-700">Tél: {assignedInvestigator.phone}</p>
                      )}
                      {assignedInvestigator.email && (
                        <p className="text-sm font-urbanist text-green-700">Email: {assignedInvestigator.email}</p>
                      )}
                      {assignedInvestigator.years_experience && (
                        <span className="inline-block mt-2 px-3 py-1 bg-green-200 text-green-900 text-xs font-urbanist font-semibold rounded-full">
                          {assignedInvestigator.years_experience} ans d'exp.
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <CandidatureActions mandateId={id} action="unassign" />
                      <Link href={`/agence/enqueteurs/${assignedInvestigator.id}`}>
                        <Button variant="outline" size="sm" className="w-full bg-transparent">
                          Voir profil
                        </Button>
                      </Link>
                      <Link href={`/agence/messages/direct/${assignedInvestigator.id}`}>
                        <Button variant="outline" size="sm" className="w-full bg-transparent">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Contacter
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-urbanist text-gray-600">Type</p>
                  <p className="font-urbanist font-semibold text-gray-900">{getSpecialtyLabel(mandate.type)}</p>
                </div>
                <div>
                  <p className="text-sm font-urbanist text-gray-600">Priorité</p>
                  <p className="font-urbanist font-semibold text-gray-900">{getPriorityLabel(mandate.priority)}</p>
                </div>
                <div>
                  <p className="text-sm font-urbanist text-gray-600">Date requise</p>
                  <p className="font-urbanist font-semibold text-gray-900">
                    {new Date(mandate.date_required).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-urbanist text-gray-600">Durée</p>
                  <p className="font-urbanist font-semibold text-gray-900">{mandate.duration}</p>
                </div>
                <div>
                  <p className="text-sm font-urbanist text-gray-600">Budget</p>
                  <p className="font-urbanist font-semibold text-gray-900">{mandate.budget || "Non spécifié"}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-urbanist text-gray-600 mb-2">Localisation</p>
                <p className="font-urbanist font-semibold text-gray-900">
                  {mandate.city}, {mandate.region} ({mandate.postal_code})
                </p>
              </div>

              <div className="mt-8 pt-8 border-t-2">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Description détaillée
                </h3>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">{mandate.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-muted p-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b-2">Informations clés</h3>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-urbanist text-gray-600">Statut</p>
                  <p className="text-sm font-urbanist font-semibold text-gray-900">{getStatusLabel(mandate.status)}</p>
                </div>
                <div>
                  <p className="text-sm font-urbanist text-gray-600">Créé le</p>
                  <p className="text-sm font-urbanist font-semibold text-gray-900">
                    {new Date(mandate.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                {assignedInvestigator && (
                  <div>
                    <p className="text-sm font-urbanist text-gray-600">Assigné à</p>
                    <p className="text-sm font-urbanist font-semibold text-gray-900">{assignedInvestigator.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced candidatures section */}
            {mandate.assignment_type === "public" && (
              <div className="bg-white rounded-2xl shadow-lg border-2 border-muted p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b-2">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Candidatures
                    <span className="ml-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold">
                      {candidaturesWithStats.length}
                    </span>
                  </h3>
                  {mandate.status === "open" && candidaturesWithStats.length === 0 && (
                    <Link href="/agence/enqueteurs">
                      <Button size="sm" variant="outline" className="text-xs font-semibold bg-transparent">
                        Rechercher
                      </Button>
                    </Link>
                  )}
                </div>

                {candidaturesWithStats.length > 0 ? (
                  <div className="space-y-3">
                    {candidaturesWithStats.map((candidature) => {
                      const profile = candidature.profiles
                      const isAssigned = mandate.assigned_to === candidature.investigator_id

                      return (
                        <div
                          key={candidature.id}
                          className={`border rounded-xl p-4 ${
                            isAssigned
                              ? "border-green-300 bg-green-50"
                              : candidature.status === "accepted"
                                ? "border-green-200 bg-green-50/50"
                                : candidature.status === "rejected"
                                  ? "border-gray-200 bg-gray-50"
                                  : "border-[#0f4c75]/20 bg-[#0f4c75]/5"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-urbanist font-semibold text-gray-900">
                                  {profile?.name || "Nom non disponible"}
                                </p>
                                {candidature.isFavorite && (
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" title="Favori" />
                                )}
                                {isAssigned && (
                                  <span className="text-xs font-urbanist font-semibold text-green-700">ASSIGNÉ</span>
                                )}
                              </div>
                              {profile?.city && <p className="text-xs font-urbanist text-gray-600">{profile.city}</p>}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {profile?.years_experience && (
                                  <span className="text-xs font-urbanist bg-white px-2 py-1 rounded-md border border-gray-200">
                                    {profile.years_experience} ans exp.
                                  </span>
                                )}
                                {candidature.stats?.average_rating && (
                                  <span className="text-xs font-urbanist bg-white px-2 py-1 rounded-md border border-gray-200 flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    {candidature.stats.average_rating.toFixed(1)}
                                  </span>
                                )}
                                {candidature.completedMandates > 0 && (
                                  <span className="text-xs font-urbanist bg-white px-2 py-1 rounded-md border border-gray-200 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                    {candidature.completedMandates} avec vous
                                  </span>
                                )}
                              </div>
                            </div>
                            <StatusBadge
                              status={candidature.status}
                              label={
                                candidature.status === "interested"
                                  ? "En attente"
                                  : candidature.status === "accepted"
                                    ? "Accepté"
                                    : "Refusé"
                              }
                              variant={
                                candidature.status === "accepted"
                                  ? "green"
                                  : candidature.status === "rejected"
                                    ? "red"
                                    : "yellow"
                              }
                            />
                          </div>

                          <div className="flex gap-2 mb-3">
                            <Link href={`/agence/enqueteurs/${candidature.investigator_id}`} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full text-xs font-urbanist bg-white">
                                <User className="h-3 w-3 mr-1" />
                                Profil
                              </Button>
                            </Link>
                            <Link href={`/agence/messages/direct/${candidature.investigator_id}`} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full text-xs font-urbanist bg-white">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Message
                              </Button>
                            </Link>
                          </div>

                          {candidature.status === "interested" && !mandate.assigned_to && (
                            <CandidatureActions
                              candidatureId={candidature.id}
                              mandateId={id}
                              investigatorId={candidature.investigator_id}
                              action="accept-reject"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm font-urbanist font-semibold text-gray-900">Aucune candidature</p>
                    <p className="text-xs font-urbanist text-gray-600 mt-1 mb-3">
                      Aucun enquêteur n'a encore postulé pour ce mandat.
                    </p>
                    <Link href="/agence/enqueteurs">
                      <Button size="sm" variant="outline" className="font-urbanist bg-transparent">
                        Rechercher des enquêteurs
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
