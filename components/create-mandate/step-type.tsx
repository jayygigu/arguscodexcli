"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, User, CheckCircle2 } from "lucide-react"
import Link from "next/link"
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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Type d'attribution
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Choisissez comment vous souhaitez attribuer ce mandat d'enquête professionnel
        </p>
      </div>

      <div className="grid gap-6">
        <button
          type="button"
          onClick={() => {
            setFormData({ ...formData, assignment_type: "public" })
            setSelectedInvestigator(null)
          }}
          className={`p-8 rounded-2xl border-2 transition-all text-left hover:shadow-lg ${
            formData.assignment_type === "public"
              ? "border-primary bg-primary/5 shadow-xl ring-4 ring-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
        >
          <div className="flex items-start gap-6">
            <div
              className={`p-4 rounded-xl ${formData.assignment_type === "public" ? "bg-primary/10" : "bg-muted"} transition-all`}
            >
              <FileText
                className={`h-8 w-8 ${formData.assignment_type === "public" ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-2xl font-bold">Mandat Public</h3>
                {formData.assignment_type === "public" && (
                  <Badge variant="default" className="bg-primary text-sm px-3 py-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Sélectionné
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed text-base mb-4">
                Publiez votre mandat pour que tous les enquêteurs qualifiés puissent le consulter et postuler. Vous
                recevrez des candidatures que vous pourrez examiner avant de choisir.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-3 py-1.5 bg-background rounded-full border">
                  ✓ Accès à tous les enquêteurs
                </span>
                <span className="text-xs px-3 py-1.5 bg-background rounded-full border">
                  ✓ Recevez plusieurs candidatures
                </span>
                <span className="text-xs px-3 py-1.5 bg-background rounded-full border">✓ Comparez et choisissez</span>
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFormData({ ...formData, assignment_type: "direct" })
            if (!selectedInvestigator) {
              router.push("/agence/enqueteurs?returnTo=/agence/creer-mandat")
            }
          }}
          className={`p-8 rounded-2xl border-2 transition-all text-left hover:shadow-lg ${
            formData.assignment_type === "direct"
              ? "border-primary bg-primary/5 shadow-xl ring-4 ring-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
        >
          <div className="flex items-start gap-6">
            <div
              className={`p-4 rounded-xl ${formData.assignment_type === "direct" ? "bg-primary/10" : "bg-muted"} transition-all`}
            >
              <User
                className={`h-8 w-8 ${formData.assignment_type === "direct" ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-2xl font-bold">Attribution Directe</h3>
                {formData.assignment_type === "direct" && (
                  <Badge variant="default" className="bg-primary text-sm px-3 py-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Sélectionné
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground leading-relaxed text-base mb-4">
                Assignez directement le mandat à un enquêteur professionnel certifié et qualifié. Idéal pour collaborer
                avec des experts de confiance ayant démontré leur excellence opérationnelle.
              </p>

              {formData.assignment_type === "direct" && selectedInvestigator && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-start gap-5 p-6 bg-gradient-to-br from-background via-primary/5 to-background border-2 border-primary/30 rounded-xl shadow-lg">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0 shadow-md">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-xl truncate">{selectedInvestigator.name}</p>
                        {selectedInvestigator.availability_status === "available" && (
                          <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Disponible
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {selectedInvestigator.city}, {selectedInvestigator.region}
                      </p>

                      {/* Professional credentials */}
                      <div className="space-y-2 text-sm">
                        {selectedInvestigator.license_number && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-normal">
                              Permis {selectedInvestigator.license_number}
                            </Badge>
                          </div>
                        )}
                        {selectedInvestigator.years_experience && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              {selectedInvestigator.years_experience} ans
                            </span>
                            d'expérience professionnelle certifiée
                          </div>
                        )}
                        {selectedInvestigator.stats && selectedInvestigator.stats.total_mandates_completed > 0 && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              {selectedInvestigator.stats.total_mandates_completed} mandats
                            </span>
                            complétés avec succès
                          </div>
                        )}
                        {selectedInvestigator.stats && selectedInvestigator.stats.average_rating && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              Note {selectedInvestigator.stats.average_rating.toFixed(1)}/5.0
                            </span>
                            • Excellence reconnue par {selectedInvestigator.stats.total_ratings} client
                            {selectedInvestigator.stats.total_ratings > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>

                      {/* Specialties */}
                      {selectedInvestigator.profile_specialties &&
                        selectedInvestigator.profile_specialties.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-primary/20">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Expertises certifiées</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedInvestigator.profile_specialties.map((s: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {s.specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push("/agence/enqueteurs?returnTo=/agence/creer-mandat")
                      }}
                      className="flex-shrink-0"
                    >
                      Changer
                    </Button>
                  </div>

                  {/* Professional trust indicators */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-muted/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Fiabilité</p>
                      <p className="text-lg font-bold text-green-600">Excellente</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Réactivité</p>
                      <p className="text-lg font-bold text-blue-600">Optimale</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Engagement</p>
                      <p className="text-lg font-bold text-primary">Prouvé</p>
                    </div>
                  </div>
                </div>
              )}

              {formData.assignment_type === "direct" && !selectedInvestigator && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full bg-transparent border-2 h-12 font-semibold mt-4"
                  asChild
                >
                  <Link href="/agence/enqueteurs?returnTo=/agence/creer-mandat">
                    <User className="h-5 w-5 mr-2" />
                    Sélectionner un enquêteur professionnel
                  </Link>
                </Button>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs px-3 py-1.5 bg-background rounded-full border">✓ Attribution immédiate</span>
                <span className="text-xs px-3 py-1.5 bg-background rounded-full border">✓ Expert certifié</span>
                <span className="text-xs px-3 py-1.5 bg-background rounded-full border">✓ Relation de confiance</span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
