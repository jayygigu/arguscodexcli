"use client"

import Link from "@/components/safe-link"
import { Button } from "@/components/ui/button"
import { User, MapPin, Clock, ChevronRight, Star, Navigation, AlertTriangle } from "lucide-react"
import type { PendingCandidature } from "@/lib/dashboard-data"

interface PendingCandidaturesProps {
  candidatures: PendingCandidature[]
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffHours < 1) return "À l'instant"
  if (diffHours === 1) return "Il y a 1 heure"
  if (diffHours < 24) return `Il y a ${diffHours} heures`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return "Hier"
  return `Il y a ${diffDays} jours`
}

function UrgencyBadge({ level }: { level: "critical" | "urgent" | "normal" }) {
  if (level === "critical") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
        <AlertTriangle className="w-3 h-3" />
        Critique
      </span>
    )
  }
  if (level === "urgent") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
        Urgent
      </span>
    )
  }
  return null
}

export function PendingCandidatures({ candidatures }: PendingCandidaturesProps) {
  if (!candidatures || candidatures.length === 0) {
    return (
      <div className="border border-border rounded-lg p-4 sm:p-6 bg-card">
        <h2 className="text-base sm:text-lg font-montserrat font-semibold text-foreground mb-4">
          Candidatures à traiter
        </h2>
        <div className="text-center py-6 sm:py-8">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-urbanist text-sm sm:text-base">Aucune candidature en attente</p>
          <p className="text-xs sm:text-sm text-muted-foreground font-urbanist mt-1">
            Les enquêteurs intéressés par vos mandats apparaîtront ici
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-base sm:text-lg font-montserrat font-semibold text-foreground">Candidatures à traiter</h2>
          <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {candidatures.length}
          </span>
        </div>
        <Link href="/agence/candidatures">
          <Button variant="ghost" size="sm" className="text-primary font-urbanist text-xs sm:text-sm h-8 sm:h-9">
            <span className="hidden sm:inline">Tout voir</span>
            <span className="sm:hidden">Voir</span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="divide-y divide-border">
        {candidatures.slice(0, 5).map((candidature) => (
          <Link key={candidature.id} href={`/agence/mandats/${candidature.mandate_id}`} className="block">
            <div className="p-3 sm:p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <span className="font-urbanist font-medium text-foreground truncate text-sm">
                      {candidature.investigator_name}
                    </span>
                    <span className="text-muted-foreground text-xs sm:text-sm hidden sm:inline">pour</span>
                    <span className="font-urbanist font-medium text-foreground truncate text-sm">
                      {candidature.mandate_title}
                    </span>
                    <UrgencyBadge level={candidature.urgency_level} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground font-urbanist">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {candidature.investigator_city}
                    </span>

                    {candidature.distance_km !== null && (
                      <span className="flex items-center gap-1 text-primary">
                        <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {candidature.distance_km} km
                      </span>
                    )}

                    {candidature.investigator_rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-yellow-400 text-yellow-400" />
                        {candidature.investigator_rating.toFixed(1)}
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {timeAgo(candidature.created_at)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 font-urbanist shrink-0 h-8 sm:h-9 text-xs sm:text-sm"
                >
                  Examiner
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {candidatures.length > 5 && (
        <div className="p-2 sm:p-3 bg-muted/30 border-t border-border">
          <Link href="/agence/candidatures">
            <Button variant="ghost" className="w-full font-urbanist text-primary text-xs sm:text-sm h-8 sm:h-9">
              Voir les {candidatures.length - 5} autres candidatures
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
