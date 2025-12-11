"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase-browser"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/loading-state"
import { ArrowLeft, MapPin, Phone, Mail, Calendar, Briefcase, Award, MessageSquare } from "lucide-react"
import { getSpecialtyLabel } from "@/constants/specialties"
import { AgencyNav } from "@/components/agency-nav"
import { FavoriteButton } from "@/components/favorite-button"
import { InvestigatorStatsCard } from "@/components/investigator-stats-card"
import { CollaborationHistory } from "@/components/collaboration-history"
import { Breadcrumb } from "@/components/breadcrumb"

type Investigator = {
  id: string
  name: string
  license_number: string | null
  phone: string | null
  email: string | null
  city: string | null
  region: string | null
  postal_code: string | null
  address: string | null
  years_experience: number
  availability_status: string
  radius: number
  created_at: string
  last_seen_at: string | null
  is_online: boolean
  profile_specialties: { specialty: string }[]
}

type UnavailableDate = {
  id: string
  date: string
  created_at: string
}

export default function InvestigatorProfilePage() {
  const router = useRouter()
  const params = useParams()
  const investigatorId = params.investigatorId as string
  const supabase = createClient()

  const [investigator, setInvestigator] = useState<Investigator | null>(null)
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([])
  const [stats, setStats] = useState<any>(null)
  const [collaborationHistory, setCollaborationHistory] = useState<any>(null)
  const [agencyId, setAgencyId] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"general" | "unavailability" | "collaboration">("general")

  useEffect(() => {
    checkAuth()
    loadInvestigator()
    loadUnavailableDates()
  }, [investigatorId])

  useEffect(() => {
    if (!investigatorId) return

    const channel = supabase
      .channel(`profile-${investigatorId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${investigatorId}`,
        },
        (payload) => {
          setInvestigator((prev) => {
            if (!prev) return null
            return {
              ...prev,
              is_online: payload.new.is_online,
              last_seen_at: payload.new.last_seen_at,
              availability_status: payload.new.availability_status,
            }
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [investigatorId])

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/agence/login")
      return
    }

    const { data: agency } = await supabase.from("agencies").select("id").eq("owner_id", user.id).single()

    if (agency) {
      setAgencyId(agency.id)
      loadCollaborationHistory(agency.id)
      checkIfFavorite(agency.id)
    }
  }

  async function checkIfFavorite(agencyId: string) {
    const { data } = await supabase
      .from("investigator_favorites")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("investigator_id", investigatorId)
      .single()

    setIsFavorite(!!data)
  }

  async function loadInvestigator() {
    setLoading(true)

    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        *,
        profile_specialties(specialty),
        investigator_stats(*)
      `,
      )
      .eq("id", investigatorId)
      .single()

    if (error) {
      console.error("Error loading investigator:", error)
      setLoading(false)
      return
    }

    setInvestigator(data)
    setStats(data.investigator_stats?.[0] || null)
    setLoading(false)
  }

  async function loadCollaborationHistory(agencyId: string) {
    const { data: mandates, error } = await supabase
      .from("mandates")
      .select(
        `
        id,
        title,
        status,
        created_at,
        updated_at,
        mandate_ratings(rating, comment, on_time)
      `,
      )
      .eq("agency_id", agencyId)
      .eq("assigned_to", investigatorId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading collaboration history:", error)
      return
    }

    const completed = mandates?.filter((m) => m.status === "completed") || []
    const inProgress = mandates?.filter((m) => m.status === "in-progress") || []

    setCollaborationHistory({
      total_mandates: mandates?.length || 0,
      completed_mandates: completed.length,
      in_progress_mandates: inProgress.length,
      last_collaboration: mandates?.[0]?.created_at || null,
      mandates: mandates || [],
    })
  }

  async function loadUnavailableDates() {
    const { data, error } = await supabase
      .from("unavailable_dates")
      .select("*")
      .eq("profile_id", investigatorId)
      .order("date", { ascending: true })

    if (error) {
      console.error("Error loading unavailable dates:", error)
      return
    }

    setUnavailableDates(data || [])
  }

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return null
    const date = new Date(lastSeen)
    return date.toLocaleString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return <LoadingState message="Chargement du profil..." />
  }

  if (!investigator) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-montserrat font-bold text-gray-900 mb-4">Enquêteur non trouvé</h2>
          <Link href="/agence/enqueteurs">
            <Button className="bg-[#0f4c75] hover:bg-[#0a3552] rounded-xl">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  const datesByMonth = unavailableDates.reduce(
    (acc, item) => {
      const date = new Date(item.date)
      const monthKey = date.toLocaleDateString("fr-CA", { year: "numeric", month: "long" })
      if (!acc[monthKey]) {
        acc[monthKey] = []
      }
      acc[monthKey].push(item)
      return acc
    },
    {} as Record<string, UnavailableDate[]>,
  )

  return (
    <div className="min-h-screen bg-white">
      <AgencyNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={[{ label: "Enquêteurs", href: "/agence/enqueteurs" }]} currentLabel={investigator.name} />

        <div className="mb-6">
          <Link href="/agence/enqueteurs">
            <Button variant="ghost" size="sm" className="font-urbanist">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la liste des enquêteurs
            </Button>
          </Link>
        </div>

        <div className="bg-white border border-gray-300 shadow-sm rounded-xl">
          <div className="p-8 border-b border-gray-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-montserrat font-bold text-gray-900">{investigator.name}</h2>
                  {agencyId && (
                    <FavoriteButton
                      investigatorId={investigator.id}
                      agencyId={agencyId}
                      isFavorite={isFavorite}
                      onToggle={setIsFavorite}
                      variant="button"
                      size="sm"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${investigator.is_online ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <span className="text-sm font-urbanist text-gray-600">
                    {investigator.is_online ? (
                      "En ligne maintenant"
                    ) : (
                      <>
                        Hors ligne
                        {investigator.last_seen_at && (
                          <> - Dernière connexion: {formatLastSeen(investigator.last_seen_at)}</>
                        )}
                      </>
                    )}
                  </span>
                </div>
              </div>
              <span
                className={`px-4 py-2 rounded-xl text-sm font-urbanist font-medium ${
                  investigator.availability_status === "available"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : investigator.availability_status === "busy"
                      ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                      : "bg-gray-50 text-gray-700 border border-gray-200"
                }`}
              >
                {investigator.availability_status === "available"
                  ? "Disponible"
                  : investigator.availability_status === "busy"
                    ? "Occupé"
                    : "Indisponible"}
              </span>
            </div>

            {stats && (
              <div className="mb-6">
                <InvestigatorStatsCard stats={stats} />
              </div>
            )}

            <div className="flex gap-3">
              <Link href={`/agence/messages/direct/${investigator.id}`} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-gray-300 hover:bg-[#0f4c75]/5 font-urbanist rounded-xl"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Envoyer un message
                </Button>
              </Link>
              <Link href={`/agence/creer-mandat?investigator=${investigator.id}`} className="flex-1">
                <Button className="w-full bg-[#0f4c75] hover:bg-[#0a3552] font-urbanist rounded-xl">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Créer un mandat
                </Button>
              </Link>
            </div>

            <div className="mt-3">
              <Link href={`/agence/mandats?investigator=${investigator.id}`}>
                <Button variant="link" size="sm" className="w-full text-[#0f4c75] font-urbanist">
                  Voir tous les mandats avec cet enquêteur
                </Button>
              </Link>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab("general")}
                className={`px-6 py-4 text-sm font-urbanist font-medium border-b-2 transition-colors ${
                  activeTab === "general"
                    ? "border-[#0f4c75] text-[#0f4c75]"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Informations générales
              </button>
              <button
                onClick={() => setActiveTab("unavailability")}
                className={`px-6 py-4 text-sm font-urbanist font-medium border-b-2 transition-colors ${
                  activeTab === "unavailability"
                    ? "border-[#0f4c75] text-[#0f4c75]"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Indisponibilités
                {unavailableDates.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-[#0f4c75] text-white text-xs rounded-full">
                    {unavailableDates.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("collaboration")}
                className={`px-6 py-4 text-sm font-urbanist font-medium border-b-2 transition-colors ${
                  activeTab === "collaboration"
                    ? "border-[#0f4c75] text-[#0f4c75]"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Historique collaboration
                {collaborationHistory?.total_mandates > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-[#0f4c75] text-white text-xs rounded-full">
                    {collaborationHistory.total_mandates}
                  </span>
                )}
              </button>
            </div>
          </div>

          {activeTab === "general" && (
            <div className="p-8 space-y-8">
              <div>
                <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#0f4c75]" />
                  Informations professionnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {investigator.license_number && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <Award className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-urbanist text-gray-600">Numéro de permis</p>
                        <p className="font-urbanist font-medium text-gray-900">{investigator.license_number}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <Briefcase className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-urbanist text-gray-600">Années d'expérience</p>
                      <p className="font-urbanist font-medium text-gray-900">{investigator.years_experience} ans</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-urbanist text-gray-600">Rayon d'action</p>
                      <p className="font-urbanist font-medium text-gray-900">{investigator.radius} km</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-urbanist text-gray-600">Membre depuis</p>
                      <p className="font-urbanist font-medium text-gray-900">
                        {new Date(investigator.created_at).toLocaleDateString("fr-CA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {investigator.profile_specialties && investigator.profile_specialties.length > 0 && (
                <div>
                  <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-4">Spécialités</h3>
                  <div className="flex flex-wrap gap-2">
                    {investigator.profile_specialties.map((s: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-[#0f4c75]/10 text-[#0f4c75] border border-[#0f4c75]/20 text-sm font-urbanist rounded-lg"
                      >
                        {getSpecialtyLabel(s.specialty)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-4">Coordonnées</h3>
                <div className="space-y-3">
                  {investigator.phone && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <Phone className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-urbanist text-gray-600">Téléphone</p>
                        <a
                          href={`tel:${investigator.phone}`}
                          className="font-urbanist font-medium text-[#0f4c75] hover:text-[#0a3552]"
                        >
                          {investigator.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {investigator.email && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-urbanist text-gray-600">Courriel</p>
                        <a
                          href={`mailto:${investigator.email}`}
                          className="font-urbanist font-medium text-[#0f4c75] hover:text-[#0a3552]"
                        >
                          {investigator.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(investigator.city || investigator.region) && (
                <div>
                  <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#0f4c75]" />
                    Localisation
                  </h3>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="font-urbanist text-gray-900">{investigator.city}</p>
                    {investigator.region && (
                      <p className="font-urbanist text-gray-600 text-sm mt-1">{investigator.region}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "unavailability" && (
            <div className="p-8">
              <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#0f4c75]" />
                Dates d'indisponibilité
              </h3>

              {unavailableDates.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-xl">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-urbanist text-gray-600">Aucune date d'indisponibilité enregistrée</p>
                  <p className="text-sm font-urbanist text-gray-500 mt-2">
                    L'enquêteur n'a pas encore défini de dates d'indisponibilité
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(datesByMonth).map(([month, dates]) => (
                    <div key={month}>
                      <h4 className="text-sm font-urbanist font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        {month}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {dates.map((item) => {
                          const date = new Date(item.date)
                          const dayName = date.toLocaleDateString("fr-CA", { weekday: "short" })
                          const dayNumber = date.getDate()
                          const isPast = date < new Date()

                          return (
                            <div
                              key={item.id}
                              className={`p-4 border rounded-xl text-center ${
                                isPast
                                  ? "bg-gray-50 border-gray-200 text-gray-400"
                                  : "bg-red-50 border-red-200 text-red-700"
                              }`}
                            >
                              <div className="text-xs font-urbanist uppercase font-medium mb-1">{dayName}</div>
                              <div className="text-2xl font-montserrat font-bold">{dayNumber}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "collaboration" && (
            <div className="p-8">
              <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#0f4c75]" />
                Historique de collaboration
              </h3>
              {agencyId && investigatorId && (
                <CollaborationHistory
                  agencyId={agencyId}
                  investigatorId={investigatorId}
                  history={collaborationHistory}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
