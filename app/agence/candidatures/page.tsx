"use client"

// Force dynamic rendering - never prerender this page
export const dynamic = 'force-dynamic'
export const dynamicParams = true

import { useEffect, useState } from "react"
import { useSupabaseClient } from "@/hooks/use-supabase-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { LoadingState } from "@/components/loading-state"
import { EmptyState } from "@/components/empty-state"
import { Inbox, User, Briefcase, MessageSquare, RotateCcw, Loader2 } from "lucide-react"
import { AgencyNav } from "@/components/agency-nav"
import { CandidatureIntroCard } from "@/components/workflow/candidature-intro-card"
import { CandidatureActions } from "@/components/candidature-actions"
import { Badge } from "@/components/ui/badge"
import { getCandidatureStatusConfig } from "@/lib/workflow-config"
import { useAgencyAuth } from "@/hooks/use-agency-auth"

export default function CandidaturesPage() {
  const [candidatures, setCandidatures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [showIntroCard, setShowIntroCard] = useState(true)
  const router = useRouter()
  const supabase = useSupabaseClient()

  const { agency, loading: authLoading } = useAgencyAuth({ requireVerified: true })

  useEffect(() => {
    const dismissed = localStorage.getItem("candidatures-intro-dismissed")
    if (dismissed) setShowIntroCard(false)
  }, [])

  useEffect(() => {
    if (agency) {
      loadCandidatures()
    }
  }, [agency])

  const handleDismissIntro = () => {
    setShowIntroCard(false)
    localStorage.setItem("candidatures-intro-dismissed", "true")
  }

  async function loadCandidatures() {
    if (!agency || !supabase) return

    try {
      setLoading(true)

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
        console.error("Error loading candidatures:", error)
        return
      }

      const validCandidatures =
        interests?.filter((c) => {
          if (c.status === "interested" && c.mandates?.assigned_to && c.mandates.assigned_to !== c.investigator_id) {
            return false
          }
          return true
        }) || []

      setCandidatures(validCandidatures)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Vérification en cours...</span>
        </div>
      </div>
    )
  }

  const filteredCandidatures = candidatures.filter((c) => {
    if (filter === "all") return true
    return c.status === filter
  })

  const pendingCount = candidatures.filter((c) => c.status === "interested").length

  const getStatusBadge = (status: string) => {
    const config = getCandidatureStatusConfig(status)
    const colorClasses = {
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
      green: "bg-green-100 text-green-800 border-green-300",
      red: "bg-red-100 text-red-800 border-red-300",
    }
    return (
      <Badge variant="outline" className={colorClasses[config.color as keyof typeof colorClasses]}>
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return <LoadingState message="Chargement des candidatures..." />
  }

  // ... existing code (rest of the component unchanged) ...
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <AgencyNav currentPage="candidatures" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2">Candidatures</h2>
          <p className="text-muted-foreground text-lg">
            Gérez les candidatures des enquêteurs pour vos mandats publics
          </p>
        </div>

        {showIntroCard && (
          <div className="mb-8">
            <CandidatureIntroCard pendingCount={pendingCount} onDismiss={handleDismissIntro} />
          </div>
        )}

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-3">
          {[
            { key: "all", label: "Toutes", count: candidatures.length },
            {
              key: "interested",
              label: "En attente",
              count: candidatures.filter((c) => c.status === "interested").length,
            },
            { key: "accepted", label: "Acceptées", count: candidatures.filter((c) => c.status === "accepted").length },
            { key: "rejected", label: "Refusées", count: candidatures.filter((c) => c.status === "rejected").length },
          ].map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
              size="lg"
              className={`font-semibold ${filter === f.key ? "shadow-lg" : ""}`}
            >
              {f.label}
              <span className="ml-2 px-2 py-0.5 bg-background/20 rounded-full text-xs font-bold">{f.count}</span>
            </Button>
          ))}

          <Button variant="ghost" size="icon" onClick={loadCandidatures} className="ml-auto" title="Actualiser">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {filteredCandidatures.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aucune candidature"
            description={
              filter === "all"
                ? "Publiez un mandat public pour recevoir des candidatures d'enquêteurs."
                : `Aucune candidature avec le statut "${getCandidatureStatusConfig(filter).label}".`
            }
            action={{ label: "Créer un mandat", href: "/agence/creer-mandat" }}
          />
        ) : (
          <div className="space-y-4">
            {filteredCandidatures.map((candidature) => {
              const profile = candidature.profiles
              const mandate = candidature.mandates
              const statusConfig = getCandidatureStatusConfig(candidature.status)

              return (
                <div
                  key={candidature.id}
                  className={`bg-white shadow-md border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                    statusConfig.actionRequired ? "border-yellow-200" : "border-muted"
                  }`}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold">{profile?.name || "Enquêteur"}</h3>
                        {getStatusBadge(candidature.status)}
                        {statusConfig.actionRequired && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                            Action requise
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Pour:{" "}
                        <Link
                          href={`/agence/mandats/${mandate?.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {mandate?.title}
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reçue le {new Date(candidature.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  {/* Profile summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Localisation</p>
                      <p className="text-sm font-medium">{profile?.city || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Région</p>
                      <p className="text-sm font-medium">{profile?.region || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expérience</p>
                      <p className="text-sm font-medium">{profile?.years_experience || 0} ans</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <p className="text-sm font-medium truncate">{profile?.email || "N/A"}</p>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 mb-4">
                    <Link href={`/agence/enqueteurs/${candidature.investigator_id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                        <User className="h-4 w-4" />
                        Profil
                      </Button>
                    </Link>
                    <Link href={`/agence/mandats/${mandate?.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                        <Briefcase className="h-4 w-4" />
                        Mandat
                      </Button>
                    </Link>
                    <Link href={`/agence/messages/direct/${candidature.investigator_id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </Button>
                    </Link>
                  </div>

                  {/* Action buttons with confirmation dialog */}
                  {candidature.status === "interested" && !mandate?.assigned_to && (
                    <CandidatureActions
                      candidatureId={candidature.id}
                      mandateId={mandate?.id}
                      investigatorId={candidature.investigator_id}
                      action="accept-reject"
                      investigatorName={profile?.name}
                      investigatorCity={profile?.city}
                      investigatorExperience={profile?.years_experience}
                      mandateTitle={mandate?.title}
                    />
                  )}

                  {/* Status messages */}
                  {candidature.status === "accepted" && (
                    <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        Candidature acceptée - Enquêteur assigné au mandat
                      </p>
                    </div>
                  )}

                  {candidature.status === "rejected" && (
                    <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-medium">Candidature refusée</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
