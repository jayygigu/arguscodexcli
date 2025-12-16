"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "@/components/safe-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Award,
  XCircle,
  RotateCcw,
  Plus,
  Loader2,
  User,
} from "lucide-react"
import { getSpecialtyLabel, getPriorityLabel } from "@/constants/specialties"
import { useCandidatureActions } from "@/hooks/use-candidature-actions"

interface MandatsTableProps {
  activeMandates: any[]
  completedMandates: any[]
  agencyId: string
}

export function MandatsTable({ activeMandates, completedMandates, agencyId }: MandatsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "active")
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get("type") || "all")
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get("priority") || "all")
  const [assignmentFilter, setAssignmentFilter] = useState<string>(searchParams.get("assignment") || "all")
  const [selectedMandateId, setSelectedMandateId] = useState<string | null>(
    searchParams.get("id") ||
      (activeMandates.length > 0
        ? activeMandates[0].id
        : completedMandates.length > 0
          ? completedMandates[0].id
          : null),
  )

  const { acceptCandidature, rejectCandidature, completeMandate, reopenMandate, isPending, error } =
    useCandidatureActions()

  const currentMandates = activeTab === "active" ? activeMandates : completedMandates

  const filteredMandates = useMemo(() => {
    return currentMandates.filter((mandate) => {
      const matchesSearch =
        searchQuery === "" ||
        mandate.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mandate.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mandate.city.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = typeFilter === "all" || mandate.type === typeFilter
      const matchesPriority = priorityFilter === "all" || mandate.priority === priorityFilter
      const matchesAssignment =
        activeTab === "completed" ||
        assignmentFilter === "all" ||
        (assignmentFilter === "assigned" && mandate.assigned_to) ||
        (assignmentFilter === "unassigned" && !mandate.assigned_to)

      return matchesSearch && matchesType && matchesPriority && matchesAssignment
    })
  }, [currentMandates, searchQuery, typeFilter, priorityFilter, assignmentFilter, activeTab])

  const selectedMandate = useMemo(() => {
    return filteredMandates.find((m) => m.id === selectedMandateId) || filteredMandates[0] || null
  }, [filteredMandates, selectedMandateId])

  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== "active") params.set("tab", activeTab)
    if (searchQuery) params.set("search", searchQuery)
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (priorityFilter !== "all") params.set("priority", priorityFilter)
    if (assignmentFilter !== "all") params.set("assignment", assignmentFilter)
    if (selectedMandateId) params.set("id", selectedMandateId)

    const newUrl = params.toString() ? `?${params.toString()}` : ""
    router.replace(`/agence/mandats${newUrl}`, { scroll: false })
  }, [activeTab, searchQuery, typeFilter, priorityFilter, assignmentFilter, selectedMandateId, router])

  useEffect(() => {
    if (error) {
    }
  }, [error])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // J/K for navigation (vim-style)
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        navigateToNextMandate()
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        navigateToPrevMandate()
      }
      // N for new mandate
      else if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        router.push("/agence/creer-mandat")
      }
      // / for search focus
      else if (e.key === "/") {
        e.preventDefault()
        document.getElementById("mandate-search")?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedMandateId])

  // Navigation helpers
  const navigateToNextMandate = useCallback(() => {
    const currentIndex = filteredMandates.findIndex((m) => m.id === selectedMandateId)
    if (currentIndex < filteredMandates.length - 1) {
      setSelectedMandateId(filteredMandates[currentIndex + 1].id)
    }
  }, [filteredMandates, selectedMandateId])

  const navigateToPrevMandate = useCallback(() => {
    const currentIndex = filteredMandates.findIndex((m) => m.id === selectedMandateId)
    if (currentIndex > 0) {
      setSelectedMandateId(filteredMandates[currentIndex - 1].id)
    }
  }, [filteredMandates, selectedMandateId])

  useEffect(() => {
    if (filteredMandates.length > 0 && !filteredMandates.find((m) => m.id === selectedMandateId)) {
      setSelectedMandateId(filteredMandates[0].id)
    }
  }, [activeTab, filteredMandates, selectedMandateId])

  const handleCandidatureAction = useCallback(
    async (candidatureId: string, action: "accept" | "reject") => {
      if (!selectedMandate) return

      const candidature = selectedMandate.mandate_interests?.find((c: any) => c.id === candidatureId)
      if (!candidature) {
        return
      }

      try {
        if (action === "accept") {
          const result = await acceptCandidature(candidatureId, candidature.mandate_id, candidature.investigator_id)
          if (result.success && result.redirectUrl) {
            router.push(result.redirectUrl)
            return
          }
        } else {
          await rejectCandidature(candidatureId)
        }
        router.refresh()
      } catch (err) {}
    },
    [selectedMandate, acceptCandidature, rejectCandidature, router],
  )

  const handleCompleteMandate = useCallback(async () => {
    if (!selectedMandate) return
    if (confirm("Êtes-vous sûr de vouloir marquer ce mandat comme terminé?")) {
      try {
        const result = await completeMandate(selectedMandate.id)
        if (result.success && result.redirectUrl) {
          router.push(result.redirectUrl)
          return
        }
        router.refresh()
      } catch (err) {}
    }
  }, [selectedMandate, completeMandate, router])

  const handleReopenMandate = useCallback(async () => {
    if (!selectedMandate) return
    if (confirm("Êtes-vous sûr de vouloir rouvrir ce mandat?")) {
      try {
        await reopenMandate(selectedMandate.id)
        router.refresh()
      } catch (err) {}
    }
  }, [selectedMandate, reopenMandate, router])

  const clearAllFilters = useCallback(() => {
    setSearchQuery("")
    setTypeFilter("all")
    setPriorityFilter("all")
    setAssignmentFilter("all")
  }, [])

  const hasActiveFilters = searchQuery || typeFilter !== "all" || priorityFilter !== "all" || assignmentFilter !== "all"

  return (
    <div className="space-y-4">
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group">
        <Link href="/agence/creer-mandat">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-12 w-12 sm:h-14 sm:w-14 p-0 hover:scale-110 transition-transform"
            title="Créer un nouveau mandat (Ctrl+N)"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="sr-only">Créer un mandat</span>
          </Button>
        </Link>
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
          Créer un mandat (Ctrl+N)
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Gestion des Mandats</h1>
            <p className="text-xs sm:text-sm text-gray-600">Suivez et gérez tous vos mandats en cours et complétés</p>
          </div>
          <TabsList className="bg-white shadow-sm w-full sm:w-auto">
            <TabsTrigger
              value="active"
              className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900"
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              Actifs ({activeMandates.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 sm:flex-initial gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-green-50 data-[state=active]:text-green-900"
            >
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
              Terminés ({completedMandates.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="mandate-search"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 sm:h-10 border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 sm:h-10 w-full sm:w-[140px] lg:w-[180px] border-gray-300 text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="surveillance">Surveillance</SelectItem>
                  <SelectItem value="background_check">Vérification</SelectItem>
                  <SelectItem value="fraud">Fraude</SelectItem>
                  <SelectItem value="missing_person">Personne disparue</SelectItem>
                  <SelectItem value="corporate">Corporatif</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 sm:h-10 w-full sm:w-[120px] lg:w-[150px] border-gray-300 text-sm">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                </SelectContent>
              </Select>

              {activeTab === "active" && (
                <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                  <SelectTrigger className="h-9 sm:h-10 w-full sm:w-[120px] lg:w-[150px] border-gray-300 text-sm">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="unassigned">Non assignés</SelectItem>
                    <SelectItem value="assigned">Assignés</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-gray-600 hover:text-gray-900 h-9 sm:h-10"
                >
                  <XCircle className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Réinitialiser</span>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700">
              {filteredMandates.length} mandat{filteredMandates.length > 1 ? "s" : ""}
              {hasActiveFilters ? " correspondant aux filtres" : " au total"}
            </span>
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">J</kbd>
              <span>/</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">K</kbd>
              <span>pour naviguer</span>
              <span className="mx-2">•</span>
              <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">/</kbd>
              <span>pour rechercher</span>
            </div>
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-20rem)] gap-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Left column - Mandate list */}
            <div className="w-full lg:w-[420px] bg-gray-50 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 max-h-[50vh] lg:max-h-none">
              <div className="flex-1 overflow-y-auto">
                {filteredMandates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-gray-500 p-6 sm:p-8">
                    <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mb-3 text-gray-300" />
                    <p className="text-sm sm:text-base font-medium text-center mb-1">
                      {hasActiveFilters ? "Aucun mandat trouvé" : "Aucun mandat"}
                    </p>
                    <p className="text-xs sm:text-sm text-center text-gray-400 mb-4">
                      {hasActiveFilters
                        ? "Essayez d'ajuster vos filtres de recherche"
                        : "Créez votre premier mandat pour commencer"}
                    </p>
                    {hasActiveFilters ? (
                      <Button variant="outline" size="sm" onClick={clearAllFilters}>
                        Réinitialiser les filtres
                      </Button>
                    ) : (
                      <Link href="/agence/creer-mandat">
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Créer un mandat
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredMandates.map((mandate) => {
                      const pendingCandidatures =
                        mandate.mandate_interests?.filter((c: any) => c.status === "interested").length || 0
                      const isSelected = selectedMandateId === mandate.id

                      const daysUntil = Math.ceil(
                        (new Date(mandate.date_required).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                      )
                      const isUrgent = daysUntil <= 7 && daysUntil > 0 && mandate.status !== "completed"

                      return (
                        <button
                          key={mandate.id}
                          onClick={() => setSelectedMandateId(mandate.id)}
                          className={`w-full text-left p-3 sm:p-5 hover:bg-white transition-all ${
                            isSelected ? "bg-white shadow-md border-l-4 border-l-blue-600 -ml-1" : "hover:shadow-sm"
                          }`}
                        >
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-start justify-between gap-2 sm:gap-3">
                              <h3
                                className={`font-semibold text-sm sm:text-base leading-tight line-clamp-2 ${
                                  isSelected ? "text-gray-900" : "text-gray-800"
                                }`}
                              >
                                {mandate.title}
                              </h3>
                              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                {isUrgent && (
                                  <span className="text-[10px] sm:text-xs bg-orange-100 text-orange-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    {daysUntil}j
                                  </span>
                                )}
                                {activeTab === "active" && pendingCandidatures > 0 && (
                                  <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                    {pendingCandidatures} cand.
                                  </span>
                                )}
                                {mandate.status === "in-progress" && (
                                  <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                    En cours
                                  </span>
                                )}
                                {mandate.status === "completed" && (
                                  <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    Terminé
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
                              <span className="font-medium text-gray-900 bg-gray-100 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded truncate max-w-[80px] sm:max-w-none">
                                {getSpecialtyLabel(mandate.type)}
                              </span>
                              <span
                                className={`font-medium px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded ${
                                  mandate.priority === "urgent"
                                    ? "bg-red-100 text-red-700"
                                    : mandate.priority === "high"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {getPriorityLabel(mandate.priority)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-600">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{mandate.city}</span>
                              </span>
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">
                                  {new Date(mandate.date_required).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                              </span>
                            </div>

                            {mandate.assigned_investigator && (
                              <div className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-2.5 py-1.5 rounded">
                                <User className="w-3.5 h-3.5" />
                                <span className="font-medium truncate">{mandate.assigned_investigator.name}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Mandate details */}
            <div className="flex-1 overflow-y-auto min-h-[300px] lg:min-h-0">
              {selectedMandate ? (
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
                    <div className="flex items-start justify-between gap-6 mb-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{selectedMandate.title}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg font-medium text-gray-900">
                            {getSpecialtyLabel(selectedMandate.type)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
                              selectedMandate.priority === "urgent"
                                ? "bg-red-100 text-red-800"
                                : selectedMandate.priority === "high"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {getPriorityLabel(selectedMandate.priority)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            {selectedMandate.city}, {selectedMandate.region}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-gray-600">
                            <Clock className="w-4 h-4" />
                            {new Date(selectedMandate.date_required).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {selectedMandate.status === "in-progress" && selectedMandate.assigned_to && (
                          <Button
                            onClick={handleCompleteMandate}
                            disabled={isPending}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Traitement...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Marquer terminé
                              </>
                            )}
                          </Button>
                        )}
                        {selectedMandate.status === "completed" && (
                          <Button onClick={handleReopenMandate} disabled={isPending} size="sm" variant="outline">
                            {isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Traitement...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Rouvrir
                              </>
                            )}
                          </Button>
                        )}
                        <Link href={`/agence/mandats/${selectedMandate.id}`}>
                          <Button variant="outline" size="sm" className="w-full bg-transparent">
                            Voir page complète
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Description */}
                    {selectedMandate.description && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                          Description du mandat
                        </h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                          {selectedMandate.description}
                        </p>
                      </div>
                    )}

                    {/* Assigned Investigator */}
                    {selectedMandate.assigned_investigator && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                        <h3 className="text-sm font-semibold text-blue-900 mb-4 uppercase tracking-wide">
                          Enquêteur assigné
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <User className="h-8 w-8 text-blue-500 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-lg text-gray-900">
                                {selectedMandate.assigned_investigator.name}
                              </p>
                              <p className="text-sm text-blue-800">
                                {selectedMandate.assigned_investigator.agency_name || "Agence non spécifiée"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span>
                                {selectedMandate.assigned_investigator.city},{" "}
                                {selectedMandate.assigned_investigator.region}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span>{selectedMandate.assigned_investigator.phone || "Non fourni"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span>{selectedMandate.assigned_investigator.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4 text-gray-500" />
                              <span>
                                {selectedMandate.assigned_investigator.years_experience || 0} ans d'expérience
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Candidatures */}
                    {selectedMandate.mandate_interests && selectedMandate.mandate_interests.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                          Candidatures ({selectedMandate.mandate_interests.length})
                        </h3>
                        <div className="space-y-3">
                          {selectedMandate.mandate_interests.map((candidature: any) => {
                            const investigator = candidature.investigator
                            return (
                              <div key={candidature.id} className="border rounded-xl p-5 space-y-4 bg-white shadow-sm">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="font-bold text-lg text-gray-900">
                                        {investigator?.name || "Nom non disponible"}
                                      </h4>
                                      {candidature.status === "interested" && (
                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">
                                          En attente
                                        </span>
                                      )}
                                      {candidature.status === "accepted" && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Accepté
                                        </span>
                                      )}
                                      {candidature.status === "rejected" && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-full">
                                          <XCircle className="h-3 w-3" />
                                          Refusé
                                        </span>
                                      )}
                                    </div>
                                    {investigator && (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-gray-400" />
                                          <span>
                                            {investigator.city || "N/A"}, {investigator.region || "N/A"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Phone className="h-4 w-4 text-gray-400" />
                                          <span>{investigator.phone || "Non fourni"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Mail className="h-4 w-4 text-gray-400" />
                                          <span>{investigator.email || "Non fourni"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Award className="h-4 w-4 text-gray-400" />
                                          <span>{investigator.years_experience || 0} ans d'expérience</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {candidature.status === "interested" && !selectedMandate.assigned_to && (
                                    <div className="flex gap-2 ml-4 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCandidatureAction(candidature.id, "reject")}
                                        disabled={isPending}
                                      >
                                        Refuser
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleCandidatureAction(candidature.id, "accept")}
                                        disabled={isPending}
                                      >
                                        {isPending ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Traitement...
                                          </>
                                        ) : (
                                          "Accepter"
                                        )}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-base font-medium text-gray-600 mb-1">Aucun mandat sélectionné</p>
                    <p className="text-sm text-gray-400">
                      Veuillez sélectionner un mandat dans la liste de gauche pour voir ses détails.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
