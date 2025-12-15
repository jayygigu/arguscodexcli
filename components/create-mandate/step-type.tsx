"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, CheckCircle2, Users, Zap, Shield, Star, MapPin, ArrowRight, Briefcase } from "lucide-react"
import { useRouter } from "next/navigation"

interface StepTypeProps {
  formData: {
    assignment_type: "public" | "direct"
  }
  setFormData: (data: any) => void
  selectedInvestigator: any
  setSelectedInvestigator: (inv: any) => void
}

export function StepType({ formData, setFormData, selectedInvestigator, setSelectedInvestigator }: StepTypeProps) {
  const router = useRouter()

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-montserrat font-semibold text-foreground mb-2">Type d'attribution</h2>
        <p className="text-muted-foreground font-urbanist">Comment souhaitez-vous attribuer ce mandat ?</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {/* Public Mandate Option */}
        <div
          className={`
            relative p-5 rounded-lg border-2 cursor-pointer transition-all
            ${
              formData.assignment_type === "public"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 bg-card"
            }
          `}
          onClick={() => {
            setFormData({ ...formData, assignment_type: "public" })
            setSelectedInvestigator(null)
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className={`
              p-3 rounded-lg transition-colors
              ${formData.assignment_type === "public" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
            `}
            >
              <Users className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-montserrat font-semibold text-foreground">Mandat Public</h3>
                {formData.assignment_type === "public" && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground font-urbanist mb-3">
                Les enquêteurs qualifiés peuvent postuler. Vous choisissez parmi les candidatures.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs font-normal">
                  Accès réseau complet
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  Comparez les profils
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Assignment Option */}
        <div
          className={`
            relative p-5 rounded-lg border-2 cursor-pointer transition-all
            ${
              formData.assignment_type === "direct"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 bg-card"
            }
          `}
          onClick={() => {
            setFormData({ ...formData, assignment_type: "direct" })
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className={`
              p-3 rounded-lg transition-colors
              ${formData.assignment_type === "direct" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
            `}
            >
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-montserrat font-semibold text-foreground">Attribution Directe</h3>
                {formData.assignment_type === "direct" && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground font-urbanist mb-3">
                Assignez directement à un enquêteur de confiance. Idéal pour les collaborations établies.
              </p>

              {/* Selected Investigator Card - using solid bg-primary for avatar */}
              {formData.assignment_type === "direct" && selectedInvestigator && (
                <div className="mt-4 p-4 bg-background border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary-foreground">
                        {selectedInvestigator.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-montserrat font-medium text-foreground truncate">
                          {selectedInvestigator.name}
                        </p>
                        {selectedInvestigator.availability_status === "available" && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                          >
                            Disponible
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-urbanist mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedInvestigator.city}
                        </span>
                        {selectedInvestigator.stats?.average_rating && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="h-3 w-3 fill-current" />
                            {selectedInvestigator.stats.average_rating.toFixed(1)}
                          </span>
                        )}
                        {selectedInvestigator.stats?.total_mandates_completed > 0 && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {selectedInvestigator.stats.total_mandates_completed} mandats
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push("/agence/enqueteurs?returnTo=/agence/creer-mandat")
                      }}
                    >
                      Changer
                    </Button>
                  </div>
                </div>
              )}

              {/* Select Button */}
              {formData.assignment_type === "direct" && !selectedInvestigator && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push("/agence/enqueteurs?returnTo=/agence/creer-mandat")
                  }}
                >
                  <User className="h-4 w-4 mr-2" />
                  Sélectionner un enquêteur
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline" className="text-xs font-normal">
                  <Zap className="h-3 w-3 mr-1" />
                  Attribution immédiate
                </Badge>
                <Badge variant="outline" className="text-xs font-normal">
                  <Shield className="h-3 w-3 mr-1" />
                  Relation établie
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help */}
      <p className="text-center text-sm text-muted-foreground font-urbanist">
        Vous pourrez modifier ce choix avant de soumettre votre mandat.
      </p>
    </div>
  )
}
