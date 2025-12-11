"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LoadingState } from "@/components/loading-state"
import { EmptyState } from "@/components/empty-state"
import { Inbox, AlertTriangle, User, Briefcase, MessageSquare } from "lucide-react"
import { AgencyNav } from "@/components/agency-nav"
import { useCandidatureActions } from "@/hooks/use-candidature-actions"

export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const router = useRouter()
  const supabase = createClient()
  const { acceptCandidature, rejectCandidature, isPending, error } = useCandidatureActions()

  useEffect(() => {
    loadCandidatures()
  }, [])

  useEffect(() => {
    if (error) {
      alert(`Erreur: ${error}`)
    }
  }, [error])

  useEffect(() => {
    if (!isPending) {
      loadCandidatures()
    }
  }, [isPending])

  async function loadCandidatures() {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/agence/login")
        return
      }

      const { data: agency } = await supabase.from("agencies").select("*").eq("owner_id", user.id).single()

      if (!agency) {
        console.error("[v0] No agency found for user")
        return
      }

      const { data: interests, error } = await supabase
        .from("mandate_interests")
        .select(
          `
          *,
          mandates!inner(id, title, description, assignment_type, status, agency_id, assigned_to),
          profiles:investigator_id(id, name, email, phone, city, region, years_experience)
        `,
        )
        .eq("mandates.agency_id", agency.id)
        .not("mandates.status", "in", '("cancelled","expired")')
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error loading candidatures:", error)
        return
      }

      const validCandidatures =
        interests?.filter((c) => {
          // Filter out candidatures where another investigator is already assigned
          if (c.status === "interested" && c.mandates?.assigned_to && c.mandates.assigned_to !== c.investigator_id) {
            console.log("[v0] Filtered out inconsistent candidature:", c.id)
            return false
          }
          return true
        }) || []

      setCandidatures(validCandidatures)
    } catch (error) {
      console.error("[v0] Error loading candidatures:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = (candidatureId: string, mandateId: string, investigatorId: string) => {
    acceptCandidature(candidatureId, mandateId, investigatorId)
  }

  const handleReject = (candidatureId: string) => {
    rejectCandidature(candidatureId)
  }

  const isThisInvestigatorAssigned = (candidature: any) => {
    return (
      candidature.mandates?.assigned_to &&
      candidature.mandates.assigned_to === candidature.investigator_id &&
      candidature.status === "interested"
    )
  }

  const filteredCandidatures = candidatures.filter((c) => {
    if (filter === "all") return true
    return c.status === filter
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case "interested":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">En attente</span>
        )
      case "accepted":
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Acceptée</span>
      case "rejected":
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Refusée</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>
    }
  }

  if (loading) {
    return <LoadingState message="Chargement des candidatures..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <AgencyNav currentPage="candidatures" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 text-center">
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Candidatures reçues
          </h2>
          <p className="text-muted-foreground text-xl">Gérez les candidatures des enquêteurs pour vos mandats</p>
        </div>

        <div className="mb-8 flex flex-wrap gap-3 justify-center">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="lg"
            className={`font-semibold shadow-sm ${filter === "all" ? "shadow-lg" : ""}`}
          >
            Toutes
            <span className="ml-2 px-2.5 py-0.5 bg-background/20 rounded-full text-xs font-bold">
              {candidatures.length}
            </span>
          </Button>
          <Button
            variant={filter === "interested" ? "default" : "outline"}
            onClick={() => setFilter("interested")}
            size="lg"
            className={`font-semibold shadow-sm ${filter === "interested" ? "shadow-lg" : ""}`}
          >
            En attente
            <span className="ml-2 px-2.5 py-0.5 bg-background/20 rounded-full text-xs font-bold">
              {candidatures.filter((c) => c.status === "interested").length}
            </span>
          </Button>
          <Button
            variant={filter === "accepted" ? "default" : "outline"}
            onClick={() => setFilter("accepted")}
            size="lg"
            className={`font-semibold shadow-sm ${filter === "accepted" ? "shadow-lg" : ""}`}
          >
            Acceptées
            <span className="ml-2 px-2.5 py-0.5 bg-background/20 rounded-full text-xs font-bold">
              {candidatures.filter((c) => c.status === "accepted").length}
            </span>
          </Button>
          <Button
            variant={filter === "rejected" ? "default" : "outline"}
            onClick={() => setFilter("rejected")}
            size="lg"
            className={`font-semibold shadow-sm ${filter === "rejected" ? "shadow-lg" : ""}`}
          >
            Refusées
            <span className="ml-2 px-2.5 py-0.5 bg-background/20 rounded-full text-xs font-bold">
              {candidatures.filter((c) => c.status === "rejected").length}
            </span>
          </Button>
        </div>

        {filteredCandidatures.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aucune candidature trouvée"
            description={
              filter === "all"
                ? "Vous n'avez pas encore reçu de candidatures pour vos mandats."
                : `Aucune candidature avec le statut sélectionné.`
            }
            action={{ label: "Voir les mandats", href: "/agence/mandats" }}
          />
        ) : (
          <div className="space-y-6">
            {filteredCandidatures.map((candidature) => (
              <div
                key={candidature.id}
                className="bg-white shadow-lg border-2 border-muted rounded-2xl p-8 hover:shadow-xl transition-shadow"
              >
                {isThisInvestigatorAssigned(candidature) && (
                  <div className="mb-4 p-4 bg-[#0f4c75]/5 border border-[#0f4c75]/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-[#0f4c75] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-urbanist font-medium text-[#0f4c75] mb-1">
                        Synchronisation nécessaire
                      </p>
                      <p className="text-xs font-urbanist text-gray-700">
                        Cet enquêteur est assigné au mandat mais la candidature n'est pas marquée comme acceptée.
                        Cliquez sur "Accepter" pour synchroniser.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-montserrat font-semibold text-gray-900">
                        {candidature.profiles?.name || "Nom non disponible"}
                      </h3>
                      {getStatusBadge(candidature.status)}
                    </div>
                    <p className="text-sm font-urbanist text-[#0f4c75] mb-1">
                      Pour le mandat:{" "}
                      <Link
                        href={`/agence/mandats/${candidature.mandates?.id}`}
                        className="text-[#0f4c75] hover:underline font-medium"
                      >
                        {candidature.mandates?.title}
                      </Link>
                    </p>
                    <p className="text-xs font-urbanist text-gray-500">
                      Candidature reçue le {new Date(candidature.created_at).toLocaleDateString("fr-FR")} à{" "}
                      {new Date(candidature.created_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <p className="text-xs font-urbanist text-gray-500 mb-1">Localisation</p>
                    <p className="text-sm font-urbanist font-medium text-gray-900">
                      {candidature.profiles?.city || "N/A"}, {candidature.profiles?.region || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-urbanist text-gray-500 mb-1">Expérience</p>
                    <p className="text-sm font-urbanist font-medium text-gray-900">
                      {candidature.profiles?.years_experience || 0} ans
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-urbanist text-gray-500 mb-1">Email</p>
                    <a
                      href={`mailto:${candidature.profiles?.email}`}
                      className="text-sm font-urbanist text-[#0f4c75] hover:underline"
                    >
                      {candidature.profiles?.email || "N/A"}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs font-urbanist text-gray-500 mb-1">Téléphone</p>
                    <a
                      href={`tel:${candidature.profiles?.phone}`}
                      className="text-sm font-urbanist text-[#0f4c75] hover:underline"
                    >
                      {candidature.profiles?.phone || "N/A"}
                    </a>
                  </div>
                </div>

                {candidature.message && (
                  <div className="mb-4 p-4 bg-[#0f4c75]/5 border border-[#0f4c75]/20 rounded-xl">
                    <p className="text-xs font-urbanist text-gray-500 mb-1">Message de l'enquêteur</p>
                    <p className="text-sm font-urbanist text-gray-900">{candidature.message}</p>
                  </div>
                )}

                <div className="mb-4 flex gap-2 flex-wrap">
                  <Link href={`/agence/enqueteurs/${candidature.investigator_id}`}>
                    <Button variant="outline" size="sm" className="gap-2 font-urbanist bg-transparent">
                      <User className="h-4 w-4" />
                      Voir le profil
                    </Button>
                  </Link>
                  <Link href={`/agence/mandats/${candidature.mandates?.id}`}>
                    <Button variant="outline" size="sm" className="gap-2 font-urbanist bg-transparent">
                      <Briefcase className="h-4 w-4" />
                      Voir le mandat
                    </Button>
                  </Link>
                  <Link href={`/agence/messages/direct/${candidature.investigator_id}`}>
                    <Button variant="outline" size="sm" className="gap-2 font-urbanist bg-transparent">
                      <MessageSquare className="h-4 w-4" />
                      Envoyer un message
                    </Button>
                  </Link>
                </div>

                {candidature.status === "interested" && (
                  <>
                    {!candidature.mandates?.assigned_to ? (
                      <div className="flex gap-4">
                        <Button
                          onClick={() =>
                            handleAccept(candidature.id, candidature.mandates?.id, candidature.investigator_id)
                          }
                          className="flex-1 h-12 text-base font-bold shadow-md hover:shadow-lg"
                          disabled={isPending}
                        >
                          {isPending ? "Traitement..." : "✓ Accepter et assigner"}
                        </Button>
                        <Button
                          onClick={() => handleReject(candidature.id)}
                          variant="outline"
                          className="flex-1 h-12 text-base font-bold border-2"
                          disabled={isPending}
                        >
                          ✕ Refuser
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}

                {candidature.status === "accepted" && (
                  <div className="text-center p-3 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-sm font-urbanist text-green-800 font-medium">
                      ✓ Candidature acceptée - Enquêteur assigné
                    </p>
                  </div>
                )}

                {candidature.status === "rejected" && (
                  <div className="text-center p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm font-urbanist text-red-800 font-medium">✗ Candidature refusée</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
