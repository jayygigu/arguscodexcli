"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowRight, X, FileSearch, UserCheck, MessageSquare } from "lucide-react"
import { WORKFLOW_CONFIG } from "@/lib/workflow-config"

interface CandidatureIntroCardProps {
  pendingCount: number
  onDismiss?: () => void
  showFullGuide?: boolean
}

export function CandidatureIntroCard({ pendingCount, onDismiss, showFullGuide = false }: CandidatureIntroCardProps) {
  const [expanded, setExpanded] = useState(showFullGuide)

  const steps = [
    {
      icon: FileSearch,
      title: "Mandat publié",
      description: "Votre mandat est visible par les enquêteurs qualifiés",
    },
    {
      icon: Users,
      title: "Candidatures reçues",
      description: "Les enquêteurs intéressés postulent avec leur profil",
    },
    {
      icon: UserCheck,
      title: "Vous sélectionnez",
      description: "Examinez les profils et choisissez le meilleur candidat",
    },
    {
      icon: MessageSquare,
      title: "Collaboration",
      description: "Communiquez et suivez l'avancement du mandat",
    },
  ]

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Comprendre les candidatures
                {pendingCount > 0 && (
                  <Badge variant="default" className="ml-2">
                    {pendingCount} en attente
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">Comment fonctionne le processus de mise en relation</CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="icon" onClick={onDismiss} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick summary */}
        <div className="p-4 bg-background rounded-xl border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Lorsque vous publiez un <strong>mandat public</strong>, les enquêteurs qualifiés peuvent exprimer leur
            intérêt en soumettant une candidature. Vous recevez alors une notification et pouvez examiner leur profil
            avant de les accepter ou refuser.
          </p>
        </div>

        {/* Workflow steps */}
        {expanded && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Le processus étape par étape
            </h4>
            <div className="grid gap-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status legend */}
        {expanded && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Signification des statuts
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {Object.entries(WORKFLOW_CONFIG.candidatureStatuses).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <Badge
                    variant="outline"
                    className={`
                      ${config.color === "yellow" ? "bg-yellow-100 text-yellow-800 border-yellow-300" : ""}
                      ${config.color === "green" ? "bg-green-100 text-green-800 border-green-300" : ""}
                      ${config.color === "red" ? "bg-red-100 text-red-800 border-red-300" : ""}
                    `}
                  >
                    {config.label}
                  </Badge>
                  {config.actionRequired && <span className="text-xs text-orange-600 font-medium">Action requise</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toggle button */}
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="w-full">
          {expanded ? "Réduire" : "En savoir plus"}
          <ArrowRight className={`h-4 w-4 ml-2 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </Button>
      </CardContent>
    </Card>
  )
}
