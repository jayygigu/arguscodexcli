"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase-browser"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Star, MapPin, Briefcase, ChevronRight, Award, UserCheck, X, Users, Loader2 } from "lucide-react"
import { FavoriteButton } from "@/components/favorite-button"
import { SPECIALTIES, getSpecialtyLabel } from "@/constants/specialties"
import { QUEBEC_MAJOR_CITIES } from "@/constants/quebec-regions"
import { AgencyNav } from "@/components/agency-nav"
import { Breadcrumb } from "@/components/breadcrumb"
import { useAgencyAuth } from "@/hooks/use-agency-auth"

interface Investigator {
  id: string
  name: string
  city: string
  region: string
  license_number: string
  years_experience: number | null
  availability_status: string
  profile_specialties: { specialty: string }[]
  stats: {
    average_rating: number | null
    total_ratings: number | null
    total_mandates_completed: number | null
  } | null
  is_favorite: boolean
}

export default function InvestigatorsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const { agency: authAgency, loading: authLoading } = useAgencyAuth({ requireVerified: true })

  const returnTo = searchParams.get("returnTo")
  const isSelectionMode = !!returnTo

  const [investigators, setInvestigators] = useState<Investigator[]>([])
  const [loading, setLoading] = useState(true)
  const [agencyId, setAgencyId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [availableOnly, setAvailableOnly] = useState(isSelectionMode)

  useEffect(() => {
    if (authAgency) {
      setAgencyId(authAgency.id)
      loadInvestigators(authAgency.id)
    }
  }, [authAgency])

  async function loadInvestigators(agencyIdParam?: string) {
    setLoading(true)
    try {
      const { data: profiles, error } = await supabase.from("profiles").select(`
        id,
        name,
        city,
        region,
        license_number,
        years_experience,
        availability_status,
        profile_specialties (specialty)
      `)

      if (error) throw error

      const investigatorIds = profiles?.map((p) => p.id) || []

      const { data: stats } = await supabase
        .from("investigator_stats")
        .select("*")
        .in("investigator_id", investigatorIds)

      let favorites: string[] = []
      const currentAgencyId = agencyIdParam || agencyId
      if (currentAgencyId) {
        const { data: favData } = await supabase
          .from("investigator_favorites")
          .select("investigator_id")
          .eq("agency_id", currentAgencyId)

        favorites = favData?.map((f) => f.investigator_id) || []
      }

      const enrichedInvestigators: Investigator[] =
        profiles?.map((profile) => ({
          id: profile.id,
          name: profile.name || "Enquêteur",
          city: profile.city || "Non spécifié",
          region: profile.region || "Non spécifié",
          license_number: profile.license_number || "",
          years_experience: profile.years_experience,
          availability_status: profile.availability_status || "available",
          profile_specialties: profile.profile_specialties || [],
          stats: stats?.find((s) => s.investigator_id === profile.id) || null,
          is_favorite: favorites.includes(profile.id),
        })) || []

      setInvestigators(enrichedInvestigators)
    } catch (err) {
      console.error("Error loading investigators:", err)
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

  const handleSelectInvestigator = (investigator: Investigator) => {
    if (returnTo) {
      router.push(`${returnTo}?investigator=${investigator.id}`)
    }
  }

  const handleCancelSelection = () => {
    if (returnTo) {
      router.push(returnTo)
    }
  }

  const filteredInvestigators = investigators.filter((inv) => {
    const matchesSearch =
      searchQuery === "" ||
      inv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.city?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSpecialty =
      selectedSpecialty === "all" || inv.profile_specialties?.some((s) => s.specialty === selectedSpecialty)

    const matchesRegion = selectedRegion === "all" || inv.city === selectedRegion || inv.region === selectedRegion

    const matchesFavorites = !showFavoritesOnly || inv.is_favorite

    const matchesAvailability = !availableOnly || inv.availability_status === "available"

    return matchesSearch && matchesSpecialty && matchesRegion && matchesFavorites && matchesAvailability
  })

  const getAvailabilityConfig = (status: string) => {
    switch (status) {
      case "available":
        return { label: "Disponible", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      case "busy":
        return { label: "Occupé", className: "bg-amber-50 text-amber-700 border-amber-200" }
      case "unavailable":
        return { label: "Indisponible", className: "bg-red-50 text-red-700 border-red-200" }
      default:
        return { label: "Inconnu", className: "bg-muted text-muted-foreground" }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AgencyNav />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumb items={[]} currentLabel="Enquêteurs" />

        {isSelectionMode && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-montserrat font-semibold text-foreground">Sélection d'enquêteur</h3>
                  <p className="text-sm text-muted-foreground font-urbanist">
                    Choisissez un enquêteur pour l'attribution directe de votre mandat
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleCancelSelection} className="bg-transparent">
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-montserrat font-bold text-foreground mb-2">
            {isSelectionMode ? "Sélectionner un enquêteur" : "Répertoire des enquêteurs"}
          </h1>
          <p className="text-muted-foreground font-urbanist">
            {isSelectionMode
              ? "Choisissez l'enquêteur idéal pour votre mandat"
              : "Découvrez les enquêteurs professionnels disponibles sur la plateforme"}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 p-4 bg-card border border-border rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Spécialité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes spécialités</SelectItem>
                {SPECIALTIES.map((spec) => (
                  <SelectItem key={spec.value} value={spec.value}>
                    {spec.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Région" />
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

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showFavoritesOnly}
                  onCheckedChange={(checked) => setShowFavoritesOnly(checked === true)}
                />
                <span className="text-sm font-urbanist text-foreground">Favoris</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={availableOnly} onCheckedChange={(checked) => setAvailableOnly(checked === true)} />
                <span className="text-sm font-urbanist text-foreground">Disponibles</span>
              </label>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-urbanist">
            {filteredInvestigators.length} enquêteur{filteredInvestigators.length > 1 ? "s" : ""} trouvé
            {filteredInvestigators.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Investigators List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredInvestigators.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-lg bg-card">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-montserrat font-semibold text-foreground mb-2">Aucun enquêteur trouvé</h3>
            <p className="text-sm text-muted-foreground font-urbanist mb-4">
              Modifiez vos filtres pour voir plus de résultats
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setSelectedSpecialty("all")
                setSelectedRegion("all")
                setShowFavoritesOnly(false)
                setAvailableOnly(false)
              }}
              className="bg-transparent"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInvestigators.map((investigator) => {
              const availability = getAvailabilityConfig(investigator.availability_status)

              return (
                <div
                  key={investigator.id}
                  className={`
                    p-4 border rounded-lg bg-card transition-all
                    ${isSelectionMode ? "cursor-pointer hover:border-primary hover:bg-primary/5" : "border-border"}
                  `}
                  onClick={isSelectionMode ? () => handleSelectInvestigator(investigator) : undefined}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-primary-foreground">
                        {investigator.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-montserrat font-semibold text-foreground truncate">{investigator.name}</h3>
                        <Badge variant="outline" className={availability.className}>
                          {availability.label}
                        </Badge>
                        {investigator.is_favorite && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground font-urbanist">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {investigator.city}
                        </span>
                        {investigator.years_experience && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {investigator.years_experience} ans
                          </span>
                        )}
                        {investigator.stats?.average_rating && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {investigator.stats.average_rating.toFixed(1)}
                          </span>
                        )}
                        {investigator.stats?.total_mandates_completed != null &&
                          investigator.stats.total_mandates_completed > 0 && (
                            <span className="flex items-center gap-1">
                              <Award className="h-3.5 w-3.5" />
                              {investigator.stats.total_mandates_completed} mandats
                            </span>
                          )}
                      </div>

                      {investigator.profile_specialties?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {investigator.profile_specialties.slice(0, 3).map((s) => (
                            <Badge key={s.specialty} variant="secondary" className="text-xs font-normal">
                              {getSpecialtyLabel(s.specialty)}
                            </Badge>
                          ))}
                          {investigator.profile_specialties.length > 3 && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              +{investigator.profile_specialties.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSelectionMode ? (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectInvestigator(investigator)
                          }}
                        >
                          Sélectionner
                        </Button>
                      ) : (
                        <>
                          {agencyId && (
                            <FavoriteButton
                              investigatorId={investigator.id}
                              agencyId={agencyId}
                              initialFavorite={investigator.is_favorite}
                            />
                          )}
                          <Link href={`/agence/enqueteurs/${investigator.id}`}>
                            <Button variant="outline" size="sm" className="bg-transparent">
                              Voir le profil
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
