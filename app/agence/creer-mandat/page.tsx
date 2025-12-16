"use client"

import type React from "react"
import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Building2,
  FileText,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  Search,
} from "lucide-react"
import { AgencyNav } from "@/components/agency-nav"
import { Breadcrumb } from "@/components/breadcrumb"
import { useMandates } from "@/hooks/use-mandates"
import { StepType } from "@/components/create-mandate/step-type"
import { SPECIALTIES, PRIORITY_LEVELS } from "@/constants/specialties"
import { trpc } from "@/lib/trpc-client"
import { useAgencyAuth } from "@/hooks/use-agency-auth"
import { debugLog } from "@/lib/debug-log"

type Step = "type" | "details" | "location" | "schedule" | "budget" | "review"

const STEPS: { id: Step; label: string; icon: any }[] = [
  { id: "type", label: "Type d'assignation", icon: Building2 },
  { id: "details", label: "Détails", icon: FileText },
  { id: "location", label: "Localisation", icon: MapPin },
  { id: "schedule", label: "Planning", icon: Calendar },
  { id: "budget", label: "Budget et priorité", icon: DollarSign },
  { id: "review", label: "Révision finale", icon: Eye },
]

const useGeocodeMutation = trpc.mandates.geocode.useMutation

// Main content component - isolated from hooks that might cause issues
function CreateMandateContent() {
  const [currentStep, setCurrentStep] = useState<Step>("type")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedInvestigator, setSelectedInvestigator] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const { agency, loading: authLoading } = useAgencyAuth({ requireVerified: true })

  const preselectedInvestigatorId = searchParams.get("investigator")

  const [formData, setFormData] = useState({
    title: "",
    type: "" as string,
    description: "",
    city: "",
    region: "",
    postal_code: "",
    date_required: "",
    duration: "",
    priority: "normal" as string,
    budget: "",
    assignment_type: preselectedInvestigatorId ? ("direct" as const) : ("public" as const),
  })

  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [locationError, setLocationError] = useState("")

  const { mutateAsync: searchLocationByPostalCode } = useGeocodeMutation()
  const { createMandate, isSubmitting } = useMandates()

  const handlePostalCodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      searchLocationByPostalCode()
    }
  }

  // Load investigator using API route
  useEffect(() => {
    async function loadInvestigator() {
      if (preselectedInvestigatorId) {
        try {
          debugLog('creer-mandat/page.tsx:83', 'Loading investigator', {investigatorId:preselectedInvestigatorId}, 'A')
          
          const response = await fetch(`/api/investigators/${preselectedInvestigatorId}`)
          
          if (!response.ok) {
            console.error("Error loading investigator:", response.statusText)
            return
          }

          const data = await response.json()
          debugLog('creer-mandat/page.tsx:92', 'Investigator loaded', {hasData:!!data,investigatorId:preselectedInvestigatorId}, 'A')

          if (data) {
            setSelectedInvestigator(data)
            setFormData((prev) => ({ ...prev, assignment_type: "direct" }))
          }
        } catch (err: any) {
          debugLog('creer-mandat/page.tsx:105', 'Investigator load exception', {error:err?.message,stack:err?.stack}, 'C')
          console.error("Exception loading investigator:", err)
        }
      }
    }
    loadInvestigator()
  }, [preselectedInvestigatorId])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!agency) {
    return null
  }

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case "type":
        return !!formData.assignment_type && (formData.assignment_type === "public" || !!selectedInvestigator)
      case "details":
        return !!formData.title && !!formData.type && !!formData.description
      case "location":
        return !!formData.city && !!formData.region
      case "schedule":
        return !!formData.date_required && !!formData.duration
      case "budget":
        return !!formData.priority
      default:
        return true
    }
  }

  const goToNextStep = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex < STEPS.length - 1 && canProceedToNextStep()) {
      setCurrentStep(STEPS[currentIndex + 1].id)
      setError("")
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const goToPreviousStep = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id)
      setError("")
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (loading || isSubmitting) return

    setLoading(true)
    setError("")

    try {
      debugLog('creer-mandat/page.tsx:150', 'Submit started', {hasAgency:!!agency,agencyId:agency?.id,formData:formData}, 'D')

      if (!agency) {
        throw new Error("Agence non trouvée")
      }

      const mandateData = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        city: formData.city || "À définir",
        region: formData.region || "À définir",
        postal_code: formData.postal_code || "G1A1A1",
        date_required: formData.date_required || new Date().toISOString().split("T")[0],
        duration: formData.duration || "À définir",
        priority: formData.priority,
        budget: formData.budget || "À définir",
        agency_id: agency.id,
        assignment_type: formData.assignment_type,
        assigned_to: formData.assignment_type === "direct" ? selectedInvestigator?.id : undefined,
        status: formData.assignment_type === "direct" ? "in-progress" : "open",
      }

      debugLog('creer-mandat/page.tsx:175', 'Calling createMandate', {mandateData}, 'D')

      const createdMandate = await createMandate(mandateData)

      debugLog('creer-mandat/page.tsx:179', 'createMandate result', {hasMandate:!!createdMandate,mandateId:createdMandate?.id,error:createdMandate?.error}, 'D')

      if (!createdMandate) {
        throw new Error("Échec de la création du mandat")
      }

      if (formData.assignment_type === "direct" && selectedInvestigator && createdMandate?.id) {
        debugLog('creer-mandat/page.tsx:185', 'Inserting mandate_interest', {mandateId:createdMandate.id,investigatorId:selectedInvestigator.id}, 'E')

        try {
          const interestResponse = await fetch("/api/mandates/interests", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mandate_id: createdMandate.id,
              investigator_id: selectedInvestigator.id,
              status: "accepted",
            }),
          })

          if (!interestResponse.ok) {
            console.error("Error inserting mandate_interest")
          }
        } catch (interestErr) {
          console.error("Exception inserting mandate_interest:", interestErr)
        }

        try {
          const response = await fetch("/api/notifyInvestigatorAssigned", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              investigatorId: selectedInvestigator.id,
              mandateId: createdMandate.id,
              mandateTitle: formData.title,
            }),
          })

          if (!response.ok) {
            console.error("Failed to notify investigator, but continuing...")
          }
        } catch (notifyErr) {
          console.error("Exception notifying investigator:", notifyErr)
        }
      }

      router.push(`/agence/mandats/${createdMandate.id}`)
    } catch (err: any) {
      debugLog('creer-mandat/page.tsx:220', 'Submit error', {error:err?.message,stack:err?.stack}, 'F')
      setError(err.message || "Impossible de créer le mandat")
      setLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCurrent = step.id === currentStep
          const isPast = STEPS.findIndex((s) => s.id === currentStep) > index
          const StepIcon = step.icon

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (isPast) {
                  setCurrentStep(step.id)
                  setError("")
                }
              }}
              disabled={!isPast && !isCurrent}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`
                  w-11 h-11 rounded-full flex items-center justify-center transition-all
                  ${
                    isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110"
                      : isPast
                        ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                        : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {isPast ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
              </div>
              <span
                className={`text-xs font-medium ${
                  isCurrent ? "text-foreground" : isPast ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case "type":
        return (
          <StepType
            formData={formData}
            setFormData={setFormData}
            selectedInvestigator={selectedInvestigator}
            setSelectedInvestigator={setSelectedInvestigator}
          />
        )

      case "details":
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Informations du mandat
              </h2>
              <p className="text-muted-foreground text-lg">Décrivez précisément votre mission d'enquête</p>
            </div>

            <div className="space-y-6 p-8 border-2 border-muted rounded-2xl bg-card shadow-sm">
              <div>
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Titre du mandat *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Ex: Surveillance domicile secteur Montréal Nord"
                  className="w-full h-14 px-5 border-2 border-muted rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-semibold mb-3 block">Type de mission *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full h-14 px-5 border-2 border-muted rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Sélectionnez un type de mission</option>
                  {SPECIALTIES.map((spec) => (
                    <option key={spec.value} value={spec.value}>
                      {spec.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  Description détaillée *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={8}
                  placeholder="Décrivez le contexte de l'enquête, les objectifs, les attentes spécifiques et toute information pertinente pour l'enquêteur..."
                  className="w-full px-5 py-4 border-2 border-muted rounded-xl resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>
        )

      case "location":
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Localisation
              </h2>
              <p className="text-muted-foreground text-lg">Où doit se dérouler la mission?</p>
            </div>

            <div className="space-y-6 p-8 border-2 border-muted rounded-2xl bg-card shadow-sm">
              <div>
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  Code postal *
                  {isLoadingLocation && <span className="text-xs text-muted-foreground">Recherche en cours...</span>}
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value.toUpperCase() })}
                    onKeyPress={handlePostalCodeKeyPress}
                    required
                    placeholder="Ex: H1A 1A1"
                    maxLength={7}
                    className="flex-1 h-14 px-5 border-2 border-muted rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      searchLocationByPostalCode({
                        postal_code: formData.postal_code,
                        city: formData.city,
                        region: formData.region,
                      })
                    }
                    disabled={isLoadingLocation || formData.postal_code.length < 6}
                    className="h-14 px-6"
                  >
                    {isLoadingLocation ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Recherche...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5 mr-2" />
                        Rechercher
                      </>
                    )}
                  </Button>
                </div>
                {locationError && (
                  <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{locationError}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Appuyez sur Entrée ou cliquez sur "Rechercher" pour trouver la ville et la région
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold mb-3 block">Ville *</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    placeholder="Ex: Montréal"
                    className="w-full h-14 px-5 border-2 border-muted rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold mb-3 block">Région *</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    required
                    placeholder="Ex: Montréal"
                    className="w-full h-14 px-5 border-2 border-muted rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case "schedule":
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Planning
              </h2>
              <p className="text-muted-foreground text-lg">Quand doit se réaliser la mission?</p>
            </div>

            <div className="space-y-6 p-8 border-2 border-muted rounded-2xl bg-card shadow-sm">
              <div>
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date requise *
                </label>
                <input
                  type="date"
                  value={formData.date_required}
                  onChange={(e) => setFormData({ ...formData, date_required: e.target.value })}
                  required
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full h-14 px-5 border-2 border-muted rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-2 ml-1">
                  Date à laquelle la mission doit débuter ou être complétée
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold mb-3 block">Durée estimée *</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  required
                  className="w-full h-14 px-5 border-2 border-muted rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">Sélectionnez une durée</option>
                  <option value="1-3 heures">1-3 heures</option>
                  <option value="Une demi-journée">Une demi-journée (4 heures)</option>
                  <option value="Une journée">Une journée complète (8 heures)</option>
                  <option value="2-3 jours">2-3 jours</option>
                  <option value="Une semaine">Une semaine</option>
                  <option value="2-4 semaines">2-4 semaines</option>
                  <option value="1 mois+">1 mois ou plus</option>
                  <option value="À définir">À définir avec l'enquêteur</option>
                </select>
              </div>
            </div>
          </div>
        )

      case "budget":
        return (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Budget et priorité
              </h2>
              <p className="text-muted-foreground text-lg">Définissez les paramètres financiers</p>
            </div>

            <div className="space-y-6 p-8 border-2 border-muted rounded-2xl bg-card shadow-sm">
              <div>
                <label className="text-sm font-semibold mb-3 block">Priorité du mandat *</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PRIORITY_LEVELS.map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: priority.value })}
                      className={`p-5 rounded-xl border-2 transition-all ${
                        formData.priority === priority.value
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <p className="font-bold mb-1">{priority.label}</p>
                      <p className="text-xs text-muted-foreground">{priority.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget estimé
                </label>
                <input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="Ex: 1000-1500$ / À discuter / Selon tarif"
                  className="w-full h-14 px-5 border-2 border-muted rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-2 ml-1">
                  Optionnel - Indiquez votre budget ou laissez vide
                </p>
              </div>
            </div>
          </div>
        )

      case "review":
        return (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Révision finale
              </h2>
              <p className="text-muted-foreground text-lg">Vérifiez toutes les informations avant de créer le mandat</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border-2 border-muted rounded-xl bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Type d'assignation
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep("type")}>
                    Modifier
                  </Button>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formData.assignment_type === "public" ? "Mandat Public" : "Attribution Directe"}
                </p>
                {selectedInvestigator && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Enquêteur: <span className="font-semibold">{selectedInvestigator.name}</span>
                  </p>
                )}
              </div>

              <div className="p-6 border-2 border-muted rounded-xl bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Détails
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep("details")}>
                    Modifier
                  </Button>
                </div>
                <p className="font-bold text-lg mb-2">{formData.title || "Sans titre"}</p>
                <p className="text-sm text-muted-foreground mb-2">Type: {formData.type || "Non défini"}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {formData.description || "Aucune description"}
                </p>
              </div>

              <div className="p-6 border-2 border-muted rounded-xl bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Localisation
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep("location")}>
                    Modifier
                  </Button>
                </div>
                <p className="text-lg font-semibold">
                  {formData.city || "Non définie"}, {formData.region || "N/A"}
                </p>
                {formData.postal_code && <p className="text-sm text-muted-foreground">{formData.postal_code}</p>}
              </div>

              <div className="p-6 border-2 border-muted rounded-xl bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Planning
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep("schedule")}>
                    Modifier
                  </Button>
                </div>
                <p className="text-lg font-semibold mb-1">
                  {formData.date_required
                    ? new Date(formData.date_required).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Date non définie"}
                </p>
                <p className="text-sm text-muted-foreground">Durée: {formData.duration || "Non définie"}</p>
              </div>

              <div className="p-6 border-2 border-muted rounded-xl bg-card md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Budget et priorité
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep("budget")}>
                    Modifier
                  </Button>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Priorité</p>
                    <p className="text-lg font-bold text-primary capitalize">{formData.priority || "Non définie"}</p>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="text-lg font-semibold">{formData.budget || "À discuter"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="mt-8">
      {renderStepIndicator()}

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}

        {renderStepContent()}

        <div className="flex items-center justify-between pt-8 border-t">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goToPreviousStep}
            disabled={currentStep === "type" || loading}
            className="gap-2 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>

          {currentStep === "review" ? (
            <Button type="submit" size="lg" disabled={loading || isSubmitting} className="gap-2">
              {loading || isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Créer le mandat
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={goToNextStep}
              disabled={!canProceedToNextStep() || loading}
              className="gap-2"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

// Main page component with Suspense boundary
export default function CreateMandatePage() {
  return (
    <>
      <AgencyNav currentPage="mandats" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Breadcrumb items={[{ label: "Mandats", href: "/agence/mandats" }, { label: "Créer un mandat" }]} />
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <CreateMandateContent />
        </Suspense>
      </div>
    </>
  )
}
