"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-browser"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSpecialtyLabel, SPECIALTIES } from "@/constants/specialties"
import { QUEBEC_MAJOR_CITIES } from "@/constants/quebec-regions"
import { LoadingState } from "@/components/loading-state"
import { MessageSquare, Briefcase, Award } from "lucide-react"
import { AgencyNav } from "@/components/agency-nav"
import { FavoriteButton } from "@/components/favorite-button"
import { User } from "lucide-react"

type Investigator = {
  id: string
  name: string
  city: string
  region: string
  license_number: string
  years_experience: number
  availability_status: string
  profile_specialties: { specialty: string }[]
  phone?: string
  email?: string
  is_online: boolean
  last_seen_at: string | null
  stats?: {
    total_mandates_completed: number
    average_rating: number | null
    total_ratings: number
  } | null
  is_favorite?: boolean
}

export default function EnqueteursPage() {
  const router = useRouter()
  const supabase = createClient()

  const [investigators, setInvestigators] = useState<Investigator[]>([])
  const [loading, setLoading] = useState(true)
  const [agencyId, setAgencyId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [minRating, setMinRating] = useState("0")
  const [minMandates, setMinMandates] = useState("0")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [availableOnly, setAvailableOnly] = useState(false)

  useEffect(() => {
    checkAuth()
    loadInvestigators()
  }, [])

  useEffect(() => {
    if (investigators.length === 0) return

    const investigatorIds = investigators.map((inv) => inv.id)

    const channel = supabase
      .channel("profiles-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=in.(${investigatorIds.join(",")})`,
        },
        (payload) => {
          setInvestigators((prev) =>
            prev.map((inv) =>
              inv.id === payload.new.id
                ? {
                    ...inv,
                    is_online: payload.new.is_online,
                    last_seen_at: payload.new.last_seen_at,
                  }
                : inv,
            ),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [investigators, supabase])

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
    }
  }

  async function loadInvestigators() {
    setLoading(true)

    try {
      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select(
          `
          *,
          profile_specialties(specialty)
        `,
        )
        .order("created_at", { ascending: false })

      if (profilesError) {
        console.error("Error loading profiles:", profilesError.message)
        setInvestigators([])
        setLoading(false)
        return
      }

      const { data: allAgencies } = await supabase.from("agencies").select("owner_id")
      const agencyOwnerIds = new Set((allAgencies || []).map((a) => a.owner_id))

      let favorites: Set<string> = new Set()
      if (agencyId) {
        const { data: favData, error: favError } = await supabase
          .from("investigator_favorites")
          .select("investigator_id")
          .eq("agency_id", agencyId)

        // If table doesn't exist, just continue without favorites
        if (!favError) {
          favorites = new Set((favData || []).map((f) => f.investigator_id))
        }
      }

      const actualInvestigators = (allProfiles || [])
        .filter((profile) => !agencyOwnerIds.has(profile.id))
        .map((profile) => ({
          ...profile,
          stats: null, // Stats will be null until the SQL script is executed
          is_favorite: favorites.has(profile.id),
        }))

      setInvestigators(actualInvestigators)
    } catch (error) {
      console.error("Error loading investigators:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/agence/login")
  }

  const getDisplayStatus = (investigator: Investigator) => {
    if (!investigator) return "offline"
    if (investigator.is_online) return "online"

    if (!investigator.last_seen_at) return "offline"

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (new Date(investigator.last_seen_at) > fiveMinutesAgo) return "recently_active"

    return "offline"
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

  const filteredInvestigators = investigators.filter((inv) => {
    const matchesSearch =
      searchQuery === "" ||
      inv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.city?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSpecialty =
      selectedSpecialty === "all" || inv.profile_specialties?.some((s) => s.specialty === selectedSpecialty)

    const matchesRegion = selectedRegion === "all" || inv.region === selectedRegion

    const matchesRating =
      minRating === "0" ||
      (inv.stats?.average_rating !== null &&
        inv.stats?.average_rating !== undefined &&
        inv.stats.average_rating >= Number.parseFloat(minRating))

    const matchesMandates =
      minMandates === "0" ||
      (inv.stats?.total_mandates_completed !== null &&
        inv.stats?.total_mandates_completed !== undefined &&
        inv.stats.total_mandates_completed >= Number.parseInt(minMandates))

    const matchesFavorites = !showFavoritesOnly || inv.is_favorite

    const matchesAvailable = !availableOnly || inv.availability_status === "available"

    return (
      matchesSearch &&
      matchesSpecialty &&
      matchesRegion &&
      matchesRating &&
      matchesMandates &&
      matchesFavorites &&
      matchesAvailable
    )
  })

  if (loading) {
    return <LoadingState message="Chargement des enquêteurs..." />
  }

  return (
    <div className="min-h-screen bg-white">
      <AgencyNav currentPage="enqueteurs" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-montserrat font-bold text-gray-900 mb-2">Enquêteurs disponibles</h2>
          <p className="text-gray-600 font-urbanist">
            Trouvez l'enquêteur parfait pour votre mandat ({filteredInvestigators.length} disponibles)
          </p>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="search" className="block text-base font-urbanist font-semibold text-gray-700 mb-3">
                Recherche
              </label>
              <Input
                id="search"
                placeholder="Nom ou ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full font-urbanist rounded-xl border-gray-300"
              />
            </div>
            <div>
              <label htmlFor="specialty" className="block text-base font-urbanist font-semibold text-gray-700 mb-3">
                Spécialité
              </label>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger id="specialty" className="rounded-xl border-gray-300">
                  <SelectValue placeholder="Toutes les spécialités" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les spécialités</SelectItem>
                  {SPECIALTIES.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {getSpecialtyLabel(specialty)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="region" className="block text-base font-urbanist font-semibold text-gray-700 mb-3">
                Région
              </label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger id="region" className="rounded-xl border-gray-300">
                  <SelectValue placeholder="Toutes les régions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les régions</SelectItem>
                  {QUEBEC_MAJOR_CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label htmlFor="minRating" className="block text-sm font-urbanist font-semibold text-gray-700 mb-2">
                Note minimale
              </label>
              <Select value={minRating} onValueChange={setMinRating}>
                <SelectTrigger id="minRating" className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Toutes les notes</SelectItem>
                  <SelectItem value="3">3+ étoiles</SelectItem>
                  <SelectItem value="4">4+ étoiles</SelectItem>
                  <SelectItem value="4.5">4.5+ étoiles</SelectItem>
                </SelectContent>
              </Select>
              {minRating !== "0" && (
                <p className="text-xs text-gray-500 mt-1">Note: Les enquêteurs sans évaluations sont exclus</p>
              )}
            </div>
            <div>
              <label htmlFor="minMandates" className="block text-sm font-urbanist font-semibold text-gray-700 mb-2">
                Mandats complétés
              </label>
              <Select value={minMandates} onValueChange={setMinMandates}>
                <SelectTrigger id="minMandates" className="rounded-xl border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tous</SelectItem>
                  <SelectItem value="5">Au moins 5</SelectItem>
                  <SelectItem value="10">Au moins 10</SelectItem>
                  <SelectItem value="20">Au moins 20</SelectItem>
                </SelectContent>
              </Select>
              {minMandates !== "0" && (
                <p className="text-xs text-gray-500 mt-1">Note: Les nouveaux enquêteurs sont exclus</p>
              )}
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="rounded border-gray-300 text-[#0f4c75] focus:ring-[#0f4c75]"
                />
                <span className="text-sm font-urbanist text-gray-700">Disponible immédiatement</span>
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFavoritesOnly}
                  onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                  className="rounded border-gray-300 text-[#0f4c75] focus:ring-[#0f4c75]"
                />
                <span className="text-sm font-urbanist text-gray-700">Favoris uniquement</span>
              </label>
            </div>
          </div>

          {(searchQuery ||
            selectedSpecialty !== "all" ||
            selectedRegion !== "all" ||
            minRating !== "0" ||
            minMandates !== "0" ||
            showFavoritesOnly ||
            availableOnly) && (
            <div className="mt-4">
              <Button
                onClick={() => {
                  setSearchQuery("")
                  setSelectedSpecialty("all")
                  setSelectedRegion("all")
                  setMinRating("0")
                  setMinMandates("0")
                  setShowFavoritesOnly(false)
                  setAvailableOnly(false)
                }}
                variant="outline"
                size="sm"
                className="rounded-xl border-gray-300 font-urbanist hover:bg-[#0f4c75]/5 bg-transparent"
              >
                Réinitialiser tous les filtres
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInvestigators.map((investigator) => {
            const displayStatus = getDisplayStatus(investigator)

            return (
              <div
                key={investigator.id}
                className="bg-white border border-gray-300 rounded-xl hover:border-[#0f4c75] hover:shadow-lg transition-all h-full flex flex-col"
              >
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            displayStatus === "online"
                              ? "bg-green-500 shadow-sm shadow-green-500/50"
                              : displayStatus === "recently_active"
                                ? "bg-yellow-500 shadow-sm shadow-yellow-500/50"
                                : "bg-gray-400"
                          }`}
                          aria-label={
                            displayStatus === "online"
                              ? "En ligne"
                              : displayStatus === "recently_active"
                                ? "Actif récemment"
                                : "Hors ligne"
                          }
                        />

                        {displayStatus === "online" && (
                          <div className="invisible group-hover:visible absolute left-0 top-full mt-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                            <div className="absolute -top-0.5 left-2 w-1.5 h-1.5 bg-gray-900 transform rotate-45" />
                            Actif
                          </div>
                        )}

                        {displayStatus === "recently_active" && investigator.last_seen_at && (
                          <div className="invisible group-hover:visible absolute left-0 top-full mt-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                            <div className="absolute -top-0.5 left-2 w-1.5 h-1.5 bg-gray-900 transform rotate-45" />
                            Actif il y a quelques minutes
                          </div>
                        )}

                        {displayStatus === "offline" && investigator.last_seen_at && (
                          <div className="invisible group-hover:visible absolute left-0 top-full mt-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                            <div className="absolute -top-0.5 left-2 w-1.5 h-1.5 bg-gray-900 transform rotate-45" />
                            Dernière connexion: {formatLastSeen(investigator.last_seen_at)}
                          </div>
                        )}
                        <h3 className="text-lg font-montserrat font-semibold text-gray-900 truncate">
                          {investigator.name}
                        </h3>
                        {agencyId && (
                          <FavoriteButton
                            investigatorId={investigator.id}
                            agencyId={agencyId}
                            isFavorite={investigator.is_favorite || false}
                            onToggle={() => loadInvestigators()}
                            variant="icon"
                          />
                        )}
                      </div>
                      <p className="text-sm font-urbanist text-gray-600">{investigator.city}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-urbanist font-medium whitespace-nowrap ${
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

                  {investigator.stats &&
                    (investigator.stats.total_mandates_completed > 0 || investigator.stats.average_rating) && (
                      <div className="flex items-center gap-4 mb-3 text-sm font-urbanist">
                        {investigator.stats.average_rating && (
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium text-gray-900">
                              {investigator.stats.average_rating.toFixed(1)}
                            </span>
                            <span className="text-gray-600">({investigator.stats.total_ratings})</span>
                          </div>
                        )}
                        {investigator.stats.total_mandates_completed > 0 && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-4 w-4 text-[#0f4c75]" />
                            <span className="font-medium text-gray-900">
                              {investigator.stats.total_mandates_completed}
                            </span>
                            <span className="text-gray-600">mandats</span>
                          </div>
                        )}
                      </div>
                    )}

                  <Link href={`/agence/enqueteurs/${investigator.id}`} className="block">
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 hover:bg-[#0f4c75]/5 bg-transparent font-urbanist rounded-xl"
                      size="sm"
                    >
                      Voir profil
                    </Button>
                  </Link>
                </div>

                <div className="p-6 flex-1 space-y-3">
                  <div className="space-y-2 text-sm font-urbanist">
                    {investigator.license_number && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Permis</span>
                        <span className="font-medium text-gray-900">{investigator.license_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expérience</span>
                      <span className="font-medium text-gray-900">{investigator.years_experience} ans</span>
                    </div>
                    {investigator.phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Téléphone</span>
                        <a
                          href={`tel:${investigator.phone}`}
                          className="font-medium text-[#0f4c75] hover:text-[#0a3552]"
                        >
                          {investigator.phone}
                        </a>
                      </div>
                    )}
                    {investigator.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Courriel</span>
                        <a
                          href={`mailto:${investigator.email}`}
                          className="font-medium text-[#0f4c75] hover:text-[#0a3552] truncate max-w-[180px]"
                          title={investigator.email}
                        >
                          {investigator.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {investigator.profile_specialties && investigator.profile_specialties.length > 0 && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs font-urbanist font-medium text-gray-700 mb-2">Spécialités</p>
                      <div className="flex flex-wrap gap-1.5">
                        {investigator.profile_specialties.map((s: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-[#0f4c75]/10 text-[#0f4c75] rounded text-xs font-urbanist border border-[#0f4c75]/20"
                          >
                            {getSpecialtyLabel(s.specialty)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex gap-2">
                    <Link href={`/agence/creer-mandat?investigator=${investigator.id}`} className="flex-1">
                      <Button
                        size="sm"
                        className="w-full bg-[#0f4c75] hover:bg-[#0a3552] font-urbanist rounded-xl"
                        disabled={investigator.availability_status === "unavailable"}
                      >
                        <Briefcase className="h-4 w-4 mr-1" />
                        Créer mandat
                      </Button>
                    </Link>
                    <Link href={`/agence/messages/direct/${investigator.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent border-gray-300 hover:bg-[#0f4c75]/5 font-urbanist rounded-xl"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredInvestigators.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-montserrat font-semibold text-gray-900 mb-2">Aucun enquêteur trouvé</h3>
            <p className="text-gray-600 font-urbanist mb-6">
              Essayez de modifier vos critères de recherche ou réinitialisez les filtres.
            </p>
            <Button
              onClick={() => {
                setSearchQuery("")
                setSelectedSpecialty("all")
                setSelectedRegion("all")
                setMinRating("0")
                setMinMandates("0")
                setShowFavoritesOnly(false)
                setAvailableOnly(false)
              }}
              variant="outline"
              className="font-urbanist bg-transparent"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
