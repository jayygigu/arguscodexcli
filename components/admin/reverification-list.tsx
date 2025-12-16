"use client"

import Link from "@/components/safe-link"
import { AlertTriangle, Calendar, Building2, Bell } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, differenceInDays } from "date-fns"
import { fr } from "date-fns/locale"

interface ReverificationListProps {
  agencies: any[]
  alerts: any[]
}

const alertTypeLabels: Record<string, string> = {
  "30_days": "30 jours avant",
  "14_days": "14 jours avant",
  "7_days": "7 jours avant",
  expired: "Expiration",
  custom: "Personnalisé",
}

export function ReverificationList({ agencies, alerts }: ReverificationListProps) {
  const today = new Date()

  return (
    <div className="space-y-6">
      {/* Upcoming Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-montserrat flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              Alertes à venir
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert: any) => {
                const alertDate = new Date(alert.alert_date)
                const daysUntil = differenceInDays(alertDate, today)

                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-amber-50 border border-amber-100"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-urbanist font-medium text-amber-900">{alert.agencies?.name}</p>
                      <p className="text-sm text-amber-700">
                        {alertTypeLabels[alert.alert_type]} — {format(alertDate, "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                      {daysUntil <= 0 ? "Aujourd'hui" : `Dans ${daysUntil}j`}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agencies needing re-verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-montserrat flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Comptes à re-vérifier ({agencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <p className="text-muted-foreground font-urbanist text-sm text-center py-8">
              Aucun compte ne nécessite de re-vérification
            </p>
          ) : (
            <div className="space-y-3">
              {agencies.map((agency) => {
                const expirationDate = agency.permit_expiration_date ? new Date(agency.permit_expiration_date) : null
                const daysUntilExpiration = expirationDate ? differenceInDays(expirationDate, today) : null
                const isExpired = daysUntilExpiration !== null && daysUntilExpiration <= 0

                return (
                  <Link
                    key={agency.id}
                    href={`/admin/accounts/${agency.id}`}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-urbanist font-medium text-foreground truncate">{agency.name}</p>
                        {agency.verification_status === "expired" && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Expiré
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Permis: {agency.license_number || "Non fourni"}</p>
                      {agency.re_verification_reason && (
                        <p className="text-xs text-amber-600 mt-1">{agency.re_verification_reason}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {expirationDate && (
                        <>
                          <p className="text-sm font-urbanist text-muted-foreground">
                            {isExpired ? "Expiré le" : "Expire le"}
                          </p>
                          <p className={`font-urbanist font-medium ${isExpired ? "text-red-600" : "text-foreground"}`}>
                            {format(expirationDate, "d MMM yyyy", { locale: fr })}
                          </p>
                        </>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      Vérifier
                    </Button>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
