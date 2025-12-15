"use client"

import Link from "next/link"
import { AlertCircle, MapPin, Calendar, Clock, AlertTriangle } from "lucide-react"
import type { MandateWithoutCandidature } from "@/lib/dashboard-data"

interface MandatesWithoutCandidaturesProps {
  mandates: MandateWithoutCandidature[]
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

export function MandatesWithoutCandidatures({ mandates }: MandatesWithoutCandidaturesProps) {
  if (!mandates || mandates.length === 0) {
    return null
  }

  return (
    <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
        <h2 className="text-base font-montserrat font-semibold text-amber-900 dark:text-amber-100">
          Mandats sans candidature
        </h2>
      </div>

      <div className="divide-y divide-amber-200 dark:divide-amber-800">
        {mandates.map((mandate) => (
          <Link key={mandate.id} href={`/agence/mandats/${mandate.id}`} className="block">
            <div className="p-4 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-urbanist font-medium text-foreground truncate">{mandate.title}</p>
                    <UrgencyBadge level={mandate.urgency_level} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground font-urbanist">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {mandate.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(mandate.date_required).toLocaleDateString("fr-CA")}
                    </span>
                    <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      {mandate.hours_since_creation < 24
                        ? `${mandate.hours_since_creation}h`
                        : `${Math.floor(mandate.hours_since_creation / 24)}j`}{" "}
                      sans réponse
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-3 border-t border-amber-200 dark:border-amber-800 text-center">
        <p className="text-xs text-amber-700 dark:text-amber-400 font-urbanist">
          Conseil: Vérifiez que la localisation et les dates sont correctes pour attirer plus d'enquêteurs
        </p>
      </div>
    </div>
  )
}
